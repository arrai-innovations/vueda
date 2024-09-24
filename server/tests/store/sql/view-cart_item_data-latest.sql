DROP VIEW IF EXISTS cart_item_data;

CREATE VIEW
    cart_item_data AS
SELECT
    C.id,
    C.id as cart_item_id,
    CAST(C.quantity AS TEXT) || 'x ' || P.name AS formatted_name
FROM
    store_cartitem C
    JOIN
        store_productoption P
    ON
        C.product_option_id = P.id
;

CREATE OR REPLACE RULE
    cart_item_data AS
ON INSERT TO cart_item_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    cart_item_data AS
ON UPDATE TO cart_item_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    cart_item_data AS
ON DELETE TO cart_item_data DO INSTEAD NOTHING;
