// Back To Top
document.getElementById('back-to-top').addEventListener('click', () => {
    window.scrollTo(0, 0);
});

// Alternating Colours
const setEvenAndOdd = () => {
    for (const formset of document.querySelectorAll('.formset')) {
        for (const element of formset.querySelectorAll('.field')) {
            const odd = parseInt(element.dataset.prefix.split('-').pop(), 10) % 2;
            console.log(element, parseInt(element.dataset.prefix.split('-').pop(), 10), odd);
            if (odd) {
                element.classList.add('odd');
                element.classList.remove('even');
            } else {
                element.classList.add('even');
                element.classList.remove('odd');
            }
        }
    }
};
setEvenAndOdd();

// Add Buttons
for (const button of document.querySelectorAll('.button-add-inline')) {
    button.addEventListener(
        'click', (e) => {
            const inline = e.target.dataset.inline;
            const total_forms = document.getElementById('id_' + inline + '-TOTAL_FORMS');
            const add_form_index = total_forms.value - 1;
            const els = document.querySelectorAll('[data-prefix="' + inline + '-' + add_form_index + '"]');
            let before_el = els[0];
            const parentEl = before_el.parentNode;
            for (const el of Array.from(els).reverse()) {
                const copy_el = el.cloneNode(true);
                copy_el.classList.remove('extra_field')
                parentEl.insertBefore(copy_el, before_el);
                if (!(copy_el.classList.contains('hidden') || copy_el.type === "hidden")) {
                    copy_el.dataset.default_value = copy_el.value;
                }
                before_el = copy_el;
                const index_at_end = new RegExp('-' + add_form_index + '"', 'g');
                const index_inside = new RegExp('-' + add_form_index + '-', 'g');
                el.outerHTML = el.outerHTML.replace(index_at_end, '-' + (add_form_index + 1) + '"').replace(index_inside, '-' + (add_form_index + 1) + '-');
            }
            total_forms.value = parseInt(total_forms.value, 10) + 1;
            setEvenAndOdd();
        }
    );
}

for (const formset of document.querySelectorAll('.formset')) {
    // Delete Buttons
    formset.addEventListener(
        'change', (e) => {
            if (e.target.type === 'checkbox' && e.target.name.endsWith('-DELETE')) {
                const checked = e.target.checked;
                const prefix = e.target.closest('.field').dataset.prefix;
                for (const div of document.querySelectorAll('[data-prefix="' + prefix + '"]')) {
                    if (checked) {
                        div.classList.add('disabled');
                        if (navigator.userAgent.includes('Chrome/')) {
                            div.classList.add('chrome');
                        }
                    } else {
                        div.classList.remove('disabled');
                        if (navigator.userAgent.includes('Chrome/')) {
                            div.classList.remove('chrome');
                        }
                    }
                    for (const field of div.querySelectorAll('input, textarea, select')) {
                        if (field.name.endsWith('-DELETE')) {
                            continue;
                        }
                        field.readOnly = checked;
                    }
                }
            }
        }
    );
    // Before Unload Defaults
    for (const el of document.querySelectorAll('input:not(.hidden):not([type="hidden"]), select, textarea')) {
        el.dataset.default_value = el.value;
    }
}

// Before Unload
let saving = false;
window.addEventListener('beforeunload', (event) => {
    if (!saving) {
        for (const el of document.querySelectorAll('input:not(.hidden):not([type="hidden"]), select, textarea')) {
            if (el.dataset.default_value !== el.value) {
                event.preventDefault();
            };
        }
    }
});

document.querySelector(".button-save").addEventListener('click', () => {
    saving = true;
});
