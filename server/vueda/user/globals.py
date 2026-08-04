CUD_CODENAMES = (
    "create_",
    "update_",
    "delete_",
)

# Exclude certain models and permissions from being able to have groups added to them.
# In most cases these are objects that get generated via server
# side code, and a user shouldn't be able to directly create one.
# Codenames should be '*' for ignore all CRUDL permissions,
# 'CUD' for ignore 'create_', 'read_', and 'update_',
# or 'create_', 'read_', 'update_', 'delete_', or list_ for a specific permission.
APPS_MODELS_AND_PERMISSION_CODENAMES_TO_HIDE_FROM_PERMISSION_MANAGEMENT = (
    # Should be able to read and list Group, Permission, and ContentType.
    ("auth", "group", "CUD"),
    ("auth", "permission", "CUD"),
    ("contenttypes", "contenttype", "CUD"),
    # Shouldn't be able to touch Session, Site, and OpenApiDocsGenerationObjectIdModel directly.
    ("sessions", "session", "*"),
    ("sites", "site", "*"),
    ("vueda_core", "openapidocsgenerationobjectidmodel", "*"),
    # Should be able to read and list ReleaseNote.
    ("vueda_release", "releasenote", "CUD"),
    # Only superuser and migrations should be able to touch GroupChange.
    ("vueda_user", "groupchange", "*"),
    # Should be able to read and list these vdq models.
    ("vueda_vdq", "anymailqueueitem", "CUD"),
    ("vueda_vdq", "anymailqueueitemattachment", "CUD"),
    ("vueda_vdq", "anymailqueueitemreceivercc", "CUD"),
    ("vueda_vdq", "anymailqueueitemreceiverreplyto", "CUD"),
    ("vueda_vdq", "anymailqueueitemreceiverto", "CUD"),
    ("vueda_vdq", "queueitem", "CUD"),
    ("vueda_vdq", "receiver", "CUD"),
    ("vueda_vdq", "sender", "CUD"),
    ("vueda_vdq", "sentitem", "CUD"),
    ("vueda_vdq", "smsqueueitem", "CUD"),
)
