import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import axios from 'axios';
import userRepository from '../repositories/user.repository';
import personaRepository from '../repositories/persona.repository';
import authProviderRepository from '../repositories/auth-provider.repository';
import { User, LoginInput, RegisterInput, JWTPayload, UserRole } from '@gsnake/shared-types';
import { authConfig } from '../config/auth';
import { AuthenticationError, ERROR_CODES } from '../shared/errors';

export class AuthService {
    private readonly saltRounds = 10;

    /**
     * Register new user with email and password
     */
    async register(data: RegisterInput): Promise<{ user: User; token: string }> {
        // Check if email already exists
        const existing = await userRepository.findByEmail(data.email);
        if (existing) {
            throw new AuthenticationError(ERROR_CODES.EMAIL_ALREADY_EXISTS, { email: data.email });
        }

        // Hash password
        const password_hash = await bcrypt.hash(data.password, this.saltRounds);

        // Business logic: Set default role for new users
        const user = await userRepository.create({
            email: data.email,
            password: password_hash,
            role: UserRole.USER, // Business rule: Default role is USER
        });

        // Create default persona for new user
        await personaRepository.create({
            user_id: user.id,
            language_style: 'casual',
            tone: 'neutral',
            topics_interest: ['general'],
        });

        // Generate JWT token
        const token = this.generateToken(user);

        return { user, token };
    }

    /**
     * Login user with email and password
     */
    async login(data: LoginInput): Promise<{ user: User; token: string }> {
        // Find user by email
        const user = await userRepository.findByEmail(data.email);
        if (!user || !user.password_hash) {
            throw new AuthenticationError(ERROR_CODES.INVALID_CREDENTIALS);
        }

        // Verify password
        const isValid = await bcrypt.compare(data.password, user.password_hash);
        if (!isValid) {
            throw new AuthenticationError(ERROR_CODES.INVALID_CREDENTIALS);
        }

        // Generate JWT token
        const token = this.generateToken(user);

        return { user, token };
    }

    /**
     * Azure OAuth login flow
     * Step 1: Get authorization URL
     */
    getAzureAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: authConfig.azure.clientId,
            response_type: 'code',
            redirect_uri: authConfig.azure.redirectUri,
            scope: authConfig.azure.scope,
        });

        return `${authConfig.azure.authEndpoint}?${params.toString()}`;
    }

    /**
     * Azure OAuth login flow
     * Step 2: Exchange code for token and create/update user
     */
    async azureCallback(code: string): Promise<{ user: User; token: string }> {
        try {
            // Exchange code for access token
            const tokenResponse = await axios.post(
                authConfig.azure.tokenEndpoint,
                new URLSearchParams({
                    client_id: authConfig.azure.clientId,
                    client_secret: authConfig.azure.clientSecret,
                    code,
                    redirect_uri: authConfig.azure.redirectUri,
                    grant_type: 'authorization_code',
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );

            const { access_token } = tokenResponse.data;

            // Get user info from Microsoft Graph API
            const userInfoResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            const { id: azureId, mail: email } = userInfoResponse.data;

            // Find or create user
            let user = await userRepository.findByAzureId(azureId);

            if (!user) {
                // Check if email already exists
                user = await userRepository.findByEmail(email);

                if (user) {
                    // Link Azure ID to existing user
                    user = await userRepository.update(user.id, { azure_id: azureId }) || user;
                } else {
                    // Business logic: Create new user with default role
                    user = await userRepository.create({
                        email,
                        azure_id: azureId,
                        role: UserRole.USER, // Business rule: Default role is USER
                    });

                    // Create default persona
                    await personaRepository.create({
                        user_id: user.id,
                        language_style: 'casual',
                        tone: 'neutral',
                        topics_interest: ['general'],
                    });
                }
            }

            // Generate JWT token
            const token = this.generateToken(user);

            return { user, token };
        } catch (error: any) {
            throw new AuthenticationError(ERROR_CODES.AZURE_OAUTH_FAILED, { 
                originalError: error.message 
            });
        }
    }

    /**
     * Google OAuth login flow
     * Step 1: Get authorization URL
     */
    getGoogleAuthUrl(state?: string): string {
        const params = new URLSearchParams({
            client_id: authConfig.google.clientId,
            redirect_uri: authConfig.google.redirectUri,
            response_type: 'code',
            scope: authConfig.google.scope,
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
        });

        if (state) {
            params.append('state', state);
        }

        return `${authConfig.google.authEndpoint}?${params.toString()}`;
    }

    /**
     * Google OAuth login flow
     * Step 2: Exchange code for token and create/update user
     */
    async googleCallback(code: string): Promise<{ user: User; token: string }> {
        try {
            console.info('[googleCallback] redirectUri:', authConfig.google.redirectUri);
            console.info('[googleCallback] clientId:', authConfig.google.clientId);

            const tokenResponse = await axios.post(
                authConfig.google.tokenEndpoint,
                new URLSearchParams({
                    code,
                    client_id: authConfig.google.clientId,
                    client_secret: authConfig.google.clientSecret,
                    redirect_uri: authConfig.google.redirectUri,
                    grant_type: 'authorization_code',
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const { access_token, refresh_token } = tokenResponse.data;

            const userInfoResponse = await axios.get(authConfig.google.userInfoEndpoint, {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            const { sub, email, email_verified, name, picture } = userInfoResponse.data;

            if (!email || email_verified === false) {
                throw new AuthenticationError(ERROR_CODES.GOOGLE_OAUTH_FAILED, {
                    message: 'Email chưa được xác minh',
                });
            }

            // 1) Try provider binding first
            const providerRecord = await authProviderRepository.findByProviderUser('google', sub);
            let user: User | null = null;
            if (providerRecord) {
                user = await userRepository.findById(providerRecord.user_id);
            }

            // 2) Fallback to email
            if (!user) {
                user = await userRepository.findByEmail(email);
            }

            // 3) Create user if not exists
            if (!user) {
                user = await userRepository.create({
                    email,
                    password: undefined,
                    role: UserRole.USER,
                } as any);

                await personaRepository.create({
                    user_id: user.id,
                    language_style: 'casual',
                    tone: 'neutral',
                    topics_interest: ['general'],
                });
            }

            // 4) Upsert provider binding
            await authProviderRepository.upsert({
                user_id: user.id,
                provider: 'google',
                provider_user_id: sub,
                access_token,
                refresh_token,
            });

            // Generate JWT token
            const token = this.generateToken(user);

            return { user, token };
        } catch (error: any) {
            console.error('[googleCallback] error', error.response?.data || error.message);
            throw new AuthenticationError(ERROR_CODES.GOOGLE_OAUTH_FAILED, { 
                originalError: error.response?.data || error.message 
            });
        }
    }

    /**
     * Generate JWT token for user
     */
    private generateToken(user: User): string {
        const payload: JWTPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        const secret = authConfig.jwt.secret;
        if (!secret || typeof secret !== 'string') {
            throw new Error('JWT_SECRET is not configured');
        }
        // expiresIn accepts string | number, and '7d' is a valid string format
        return jwt.sign(payload, secret, {
            expiresIn: authConfig.jwt.expiresIn as string,
        } as SignOptions);
    }

    /**
     * Verify JWT token
     */
    verifyToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, authConfig.jwt.secret) as JWTPayload;
        } catch (error) {
            throw new AuthenticationError(ERROR_CODES.INVALID_TOKEN);
        }
    }
}

export default new AuthService();
