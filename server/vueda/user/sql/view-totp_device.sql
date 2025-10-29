 CREATE VIEW totp_device_view AS
            SELECT
                COALESCE(td.id, a.id) as id,
                a.id as authenticator_id,
                a.user_id,
                COALESCE(td.method, 'totp') as method,
                a.created_at,
                COALESCE(td.last_used_at, a.last_used_at) as last_used_at
            FROM allauth_mfa_authenticator a
            LEFT JOIN your_app_totpdevice td ON a.id = td.authenticator_id
            WHERE a.type = 'totp'
