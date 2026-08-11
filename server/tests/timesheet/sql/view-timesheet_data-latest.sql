DROP VIEW IF EXISTS timesheet_data;

CREATE VIEW
    timesheet_data AS
SELECT
    T.id,
    T.id as timesheet_id,
    E.employee_number
    || ' on '
    || CAST(EXTRACT(YEAR FROM T.period_start) AS TEXT)
    || '/'
    || LPAD(CAST(EXTRACT(MONTH FROM T.period_start) AS TEXT), 2, '0')
    || '/'
    || LPAD(CAST(EXTRACT(DAY FROM T.period_start) AS TEXT), 2, '0')
    || ' to '
    || CAST(EXTRACT(YEAR FROM T.period_end) AS TEXT)
    || '/'
    || LPAD(CAST(EXTRACT(MONTH FROM T.period_end) AS TEXT), 2, '0')
    || '/'
    || LPAD(CAST(EXTRACT(DAY FROM T.period_end) AS TEXT), 2, '0')
    AS formatted_name
FROM
    timesheet_timesheet T
    JOIN
        employee_employee E
    ON
        T.employee_id = E.id
;

CREATE OR REPLACE RULE
    timesheet_data AS
ON INSERT TO timesheet_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    timesheet_data AS
ON UPDATE TO timesheet_data DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    timesheet_data AS
ON DELETE TO timesheet_data DO INSTEAD NOTHING;
