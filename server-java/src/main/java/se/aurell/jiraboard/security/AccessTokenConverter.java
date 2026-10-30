package se.aurell.jiraboard.security;

import java.util.List;
import java.util.UUID;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import se.aurell.jiraboard.entity.Role;

/** Turns a verified access token into an {@link AuthUser} principal (req.user in Express). */
public class AccessTokenConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String id = jwt.getClaimAsString(JwtService.CLAIM_ID);
        String username = jwt.getClaimAsString(JwtService.CLAIM_USERNAME);
        if (id == null || username == null) {
            throw new InvalidBearerTokenException("Not an access token");
        }
        // Tokens issued before roles existed have no role claim → user
        Role role = Role.fromValue(jwt.getClaimAsString(JwtService.CLAIM_ROLE));
        try {
            return new UsernamePasswordAuthenticationToken(new AuthUser(UUID.fromString(id), username, role), jwt, List.of());
        } catch (IllegalArgumentException e) {
            throw new InvalidBearerTokenException("Invalid user id");
        }
    }
}
