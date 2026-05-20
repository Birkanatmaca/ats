package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	identitydomain "ots/backend/internal/domain/identity"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrWrongTokenType = errors.New("wrong token type")
)

type TokenPair struct {
	AccessToken      string
	RefreshToken     string
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
}

type Claims struct {
	jwt.RegisteredClaims
	TenantID           string `json:"tenant_id"`
	Role               string `json:"role"`
	Name               string `json:"name"`
	Email              string `json:"email"`
	MustChangePassword bool   `json:"must_change_password"`
	TokenType          string `json:"token_type"`
}

type JWT struct {
	secret          []byte
	accessLifetime  time.Duration
	refreshLifetime time.Duration
}

func NewJWT(secret string, accessLifetime, refreshLifetime time.Duration) *JWT {
	if accessLifetime <= 0 {
		accessLifetime = 8 * time.Hour
	}
	if refreshLifetime <= 0 {
		refreshLifetime = 7 * 24 * time.Hour
	}
	return &JWT{
		secret:          []byte(secret),
		accessLifetime:  accessLifetime,
		refreshLifetime: refreshLifetime,
	}
}

func (j *JWT) IssuePair(principal identitydomain.Principal, now time.Time) (TokenPair, error) {
	access, accessExp, err := j.issue(principal, TokenTypeAccess, j.accessLifetime, now)
	if err != nil {
		return TokenPair{}, err
	}
	refresh, refreshExp, err := j.issue(principal, TokenTypeRefresh, j.refreshLifetime, now)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken:      access,
		RefreshToken:     refresh,
		AccessExpiresAt:  accessExp,
		RefreshExpiresAt: refreshExp,
	}, nil
}

func (j *JWT) issue(principal identitydomain.Principal, tokenType string, lifetime time.Duration, now time.Time) (string, time.Time, error) {
	expiresAt := now.Add(lifetime)
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   principal.UserID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "ots-api",
		},
		TenantID:           principal.TenantID,
		Role:               string(principal.Role),
		Name:               principal.Name,
		Email:              principal.Email,
		MustChangePassword: principal.MustChangePassword,
		TokenType:          tokenType,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(j.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, expiresAt, nil
}

func (j *JWT) Parse(tokenString string) (Claims, error) {
	parsed, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secret, nil
	})
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return Claims{}, ErrInvalidToken
	}
	return *claims, nil
}

func (j *JWT) ParseAccess(tokenString string) (Claims, error) {
	claims, err := j.Parse(tokenString)
	if err != nil {
		return Claims{}, err
	}
	if claims.TokenType != TokenTypeAccess {
		return Claims{}, ErrWrongTokenType
	}
	if claims.Subject == "" || claims.TenantID == "" || claims.Role == "" {
		return Claims{}, ErrInvalidToken
	}
	return claims, nil
}

func (j *JWT) ParseRefresh(tokenString string) (Claims, error) {
	claims, err := j.Parse(tokenString)
	if err != nil {
		return Claims{}, err
	}
	if claims.TokenType != TokenTypeRefresh {
		return Claims{}, ErrWrongTokenType
	}
	if claims.Subject == "" {
		return Claims{}, ErrInvalidToken
	}
	return claims, nil
}

func PrincipalFromClaims(claims Claims) identitydomain.Principal {
	return identitydomain.Principal{
		UserID:             claims.Subject,
		TenantID:           claims.TenantID,
		Role:               identitydomain.Role(claims.Role),
		Name:               claims.Name,
		Email:              claims.Email,
		MustChangePassword: claims.MustChangePassword,
	}
}
