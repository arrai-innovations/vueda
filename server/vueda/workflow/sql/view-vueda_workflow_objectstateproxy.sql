CREATE VIEW vueda_workflow_objectstateproxy AS
SELECT
    O.id,
    O.workflow_id,
    O.object_id,
    O.state_id,
    W.content_type_id,
    O.id AS object_state_id
FROM
    vueda_workflow_objectstate O
    JOIN vueda_workflow_workflow W ON W.id = O.workflow_id
;

CREATE OR REPLACE RULE
    vueda_workflow_objectstateproxy_on_insert AS
ON INSERT TO vueda_workflow_objectstateproxy DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    vueda_workflow_objectstateproxy_on_update AS
ON UPDATE TO vueda_workflow_objectstateproxy DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    vueda_workflow_objectstateproxy_on_delete AS
ON DELETE TO vueda_workflow_objectstateproxy DO INSTEAD NOTHING;
