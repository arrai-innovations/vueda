DROP VIEW IF EXISTS cart_data;

CREATE VIEW
    cart_data AS
SELECT
    C.id,
    C.id as cart_id,
    U.email AS formatted_name
FROM
    store_cart C
    JOIN
        store_customer S
    ON
        C.customer_id = S.id
    JOIN
        tests_user U
    ON
        S.user_id = U.id
;

CREATE OR REPLACE RULE
    cart_data AS
ON INSERT TO cart_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    cart_data AS
ON UPDATE TO cart_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    cart_data AS
ON DELETE TO cart_data DO INSTEAD NOTHING;
