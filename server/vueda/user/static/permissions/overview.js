async function save(group, permissionId, groupId, groupName) {
    const request = new Request("/routes/vueda.user/permissions/save/", {
        method: "post",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            groupId: groupId,
            groupName: groupName,
            permissionId: permissionId,
        }),
    });

    try {
        const response = await fetch(request);
        const result = await response.json();
        if (result.state === "succeeded") {
            const groupId = result.group_id;
            group.dataset.group_id = groupId;
            group.classList.remove("erred");
            group.classList.remove("dirty");
            group.classList.add("saved");

            if (result.new_name) {
                const group_divs = document.querySelectorAll('div[data-group_id="' + groupId + '"]');
                for (const group_div of group_divs) {
                    const input = group_div.querySelector("input");
                    input.value = result.new_name;
                }
            }
        } else {
            group.classList.add("erred");
            const err = group.querySelector(".group-error");
            err.innerHTML = result.errors || "An error occurred";
        }
    } catch (error) {
        group.classList.add("erred");
        const err = group.querySelector(".group-error");
        err.innerHTML = error || "An error occurred";
    }
}

async function remove(group, permissionId, groupId) {
    const request = new Request(`/routes/vueda.user/permissions/delete/${permissionId}/${groupId}/`, {
        method: "delete",
        headers: {
            "Content-Type": "application/json",
        },
    });

    try {
        const response = await fetch(request);
        const result = await response.json();
        if (result.state === "succeeded") {
            group.remove();
        } else {
            group.classList.add("erred");
            const err = group.querySelector(".group-error");
            err.innerHTML = result.errors || "An error occurred";
        }
    } catch (error) {
        group.classList.add("erred");
        const err = group.querySelector(".group-error");
        err.innerHTML = error || "An error occurred";
    }
}

// Add or Update a group on a permission.
function appsClick(e) {
    let group, groups, permission, input, saveButton, deleteButton, groupId, permissionId;
    let target = e.target;
    switch (target.dataset.action) {
        case "add":
            permission = e.target.closest(".permission");
            groups = permission.querySelector(".groups");
            if (!groups) {
                groups = document.createElement("div");
                groups.className = "groups";
                groups.dataset.permission_id = permission.dataset.permission_id;
                permission.append(groups);
            }
            group = document.createElement("div");
            group.className = "group";
            const errorDiv = document.createElement("div");
            errorDiv.className = "group-error";
            group.append(errorDiv);
            input = document.createElement("input");
            input.type = "text";
            input.className = "group-name";
            input.placeholder = "Group Name";
            group.append(input);
            saveButton = document.createElement("button");
            saveButton.classList.add("button-action", "button-save");
            saveButton.dataset.action = "save";
            saveButton.innerHTML = "Save";
            group.append(saveButton);
            deleteButton = document.createElement("button");
            deleteButton.classList.add("button-action", "button-delete");
            deleteButton.dataset.action = "delete";
            deleteButton.innerHTML = "X";
            group.append(deleteButton);
            groups.append(group);
            input.focus();
            break;
        case "save":
            input = e.target.previousElementSibling;
            group = e.target.closest(".group");
            group.classList.remove("dirty");
            group.classList.remove("saved");
            groups = group.closest(".groups");
            groupId = group.dataset.group_id;
            permissionId = groups.dataset.permission_id;
            const groupName = input.value;
            save(group, permissionId || null, groupId || null, groupName);
            break;
        case "delete":
            group = e.target.closest(".group");
            groups = group.closest(".groups");
            groupId = group.dataset.group_id;
            if (!groupId) {
                // Not saved.
                group.remove();
                return;
            }
            permissionId = groups.dataset.permission_id;
            remove(group, permissionId, groupId);
            break;
    }
}

function appsInput(e) {
    let target = e.target;
    switch (target.nodeName.toLowerCase()) {
        case "input":
            const group = e.target.closest(".group");
            let button = group.querySelector(".button-save");
            group.classList.add("dirty");
            group.classList.remove("saved");
    }
}

function appsKeyup(e) {
    let target = e.target;
    if (target.nodeName.toLowerCase() === "input" && e.keyCode === 13) {
        const group = e.target.closest(".group");
        let button = group.querySelector(".button-save");
        button.click();
    }
}

const apps = document.getElementsByClassName("apps");
for (const container of apps) {
    container.addEventListener("click", appsClick);
    container.addEventListener("input", appsInput);
    container.addEventListener("keyup", appsKeyup);
}

// collapse historic models
let historicModels = document.querySelectorAll(".model.historic");
for (let i = 0; i < historicModels.length; i++) {
    historicModels[i].style.display = "none";
}

// power the controls
function toggleHistoricModels() {
    let historicModels = document.querySelectorAll(".model.historic");
    for (let i = 0; i < historicModels.length; i++) {
        historicModels[i].style.display = historicModels[i].style.display === "none" ? "block" : "none";
    }
}

const historical_buttons = document.getElementsByClassName("toggle-historical-models");
for (const button of historical_buttons) {
    button.addEventListener("click", toggleHistoricModels);
}

function backToTop() {
    window.scrollTo(0, 0);
}

const back_to_top_buttons = document.getElementsByClassName("back-to-top");
for (const button of back_to_top_buttons) {
    button.addEventListener("click", backToTop);
}
