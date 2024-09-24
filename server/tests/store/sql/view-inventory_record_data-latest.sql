DROP VIEW IF EXISTS inventory_record_data;

CREATE VIEW
    inventory_record_data AS
SELECT
    I.id,
    I.id as inventory_record_id,
    (
        CAST(EXTRACT(YEAR FROM I.when) AS TEXT) || '-' ||
        LPAD(CAST(EXTRACT(MONTH FROM I.when) AS TEXT), 2, '0') || '-' ||
        LPAD(CAST(EXTRACT(DAY FROM I.when) AS TEXT), 2, '0') || ' - ' ||
        R.name || ' ' || CAST(I.quantity AS TEXT) || 'x ' || P.name
    ) AS formatted_name
FROM
    store_inventoryrecord I
    JOIN
        store_inventoryrecordreason R
    ON
        I.reason_id = R.id
    JOIN
        store_productoption P
    ON
        I.product_option_id = P.id
;

CREATE OR REPLACE RULE
    inventory_record_data AS
ON INSERT TO inventory_record_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    inventory_record_data AS
ON UPDATE TO inventory_record_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    inventory_record_data AS
ON DELETE TO inventory_record_data DO INSTEAD NOTHING;
