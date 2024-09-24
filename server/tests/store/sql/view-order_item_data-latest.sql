DROP VIEW IF EXISTS order_item_data;

CREATE VIEW
    order_item_data AS
SELECT
    O.id,
    O.id as order_item_id,
    CAST(C.order_number AS TEXT) || ' - ' || CAST(O.quantity AS TEXT) || 'x ' || P.name AS formatted_name
FROM
    store_orderitem O
    JOIN
        store_customerorder C
    ON
        O.customer_order_id = C.id
    JOIN
        store_productoption P
    ON
        O.product_option_id = P.id
;

CREATE OR REPLACE RULE
    order_item_data AS
ON INSERT TO order_item_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    order_item_data AS
ON UPDATE TO order_item_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    order_item_data AS
ON DELETE TO order_item_data DO INSTEAD NOTHING;
