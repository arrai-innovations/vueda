DROP VIEW IF EXISTS customer_data;

CREATE VIEW
    customer_data AS
SELECT
    C.id,
    C.id as customer_id,
    U.email AS formatted_name
FROM
    store_customer C
    JOIN
        tests_user U
    ON
        C.user_id = U.id
;

CREATE OR REPLACE RULE
    customer_data AS
ON INSERT TO customer_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    customer_data AS
ON UPDATE TO customer_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    customer_data AS
ON DELETE TO customer_data DO INSTEAD NOTHING;
