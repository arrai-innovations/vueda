DROP VIEW IF EXISTS customer_data;

CREATE VIEW
    customer_data AS
SELECT
    C.id,
    C.id as customer_id,
    -- `employee_user.email` carries the nondeterministic `case_insensitive` ICU collation, which a
    -- view column inherits.  PostgreSQL only supports LIKE against a nondeterministic collation from
    -- 18 onward, so an `icontains` filter on this column raises NotSupportedError on 15-17.  The
    -- explicit collation keeps the column usable for pattern matching on every supported version.
    U.email COLLATE pg_catalog."default" AS formatted_name
FROM
    store_customer C
    JOIN
        employee_user U
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
