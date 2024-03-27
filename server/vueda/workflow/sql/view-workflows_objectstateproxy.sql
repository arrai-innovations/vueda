CREATE VIEW workflows_objectstateproxy AS
SELECT
    O.id,
    O.workflow_id,
    O.object_id,
    O.state_id,
    W.content_type_id,
    O.id AS object_state_id
FROM
    workflow_objectstate O
    JOIN workflow_workflow W ON W.id = O.workflow_id
;

CREATE OR REPLACE RULE
    workflows_objectstateproxy_on_insert AS
ON INSERT TO workflows_objectstateproxy DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    workflows_objectstateproxy_on_update AS
ON UPDATE TO workflows_objectstateproxy DO INSTEAD NOTHING;

CREATE OR REPLACE RULE
    workflows_objectstateproxy_on_delete AS
ON DELETE TO workflows_objectstateproxy DO INSTEAD NOTHING;
