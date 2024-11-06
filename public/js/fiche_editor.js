// var
var id = localStorage.getItem("nb_editor") || 0;
var color = "#ffff00";
var liste_key_local_storage = [];
let is_charged = false;
let is_changed = false;
let date_save;
let active_color_elem = null;
liste_key_local_storage.push("nb_editor");

// gestion des btn
document.getElementById("btn_texte").addEventListener("click", () => {
    createEditorTexte(id, "", 0);
    id++;
    localStorage.setItem("nb_editor", id);
    //scroll en bas de div_editor_section_main
    document.querySelector(".div_editor_section_main").scrollTo({
        top: document.querySelector(".div_editor_section_main").scrollHeight,
        behavior: 'smooth'
    });
});
document.getElementById("btn_titre").addEventListener("click", () => {
    createEditorTitre(id, "", "Normal");
    id++;
    localStorage.setItem("nb_editor", id);
    //scroll en bas de div_editor_section_main
    document.querySelector(".div_editor_section_main").scrollTo({
        top: document.querySelector(".div_editor_section_main").scrollHeight,
        behavior: 'smooth'
    });
});
document.getElementById("btn_definition").addEventListener("click", () => {
    createEditorDefinition(id, "", "");
    id++;
    localStorage.setItem("nb_editor", id);
    //scroll en bas de div_editor_section_main
    document.querySelector(".div_editor_section_main").scrollTo({
        top: document.querySelector(".div_editor_section_main").scrollHeight,
        behavior: 'smooth'
    });
});
document.getElementById("btn_texte_retenir").addEventListener("click", () => {
    createEditorTexte(id, "", 1);
    id++;
    localStorage.setItem("nb_editor", id);
    //scroll en bas de div_editor_section_main
    document.querySelector(".div_editor_section_main").scrollTo({
        top: document.querySelector(".div_editor_section_main").scrollHeight,
        behavior: 'smooth'
    });
});

function hexToRgb(hex) {
    // Supprime le symbole # si présent
    hex = hex.replace(/^#/, "");

    // Convertit les paires hexadécimales en valeurs décimales pour RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgb(${r}, ${g}, ${b})`;
}
function bold() {
    document.execCommand("bold");
}
function italic() {
    document.execCommand("italic");
}
function underline() {
    document.execCommand("underline");
}
function insertUnorderedList() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        document.execCommand("insertUnorderedList");
    }
}
function insertOrderedList() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        document.execCommand("insertOrderedList");
    }
}
function justifyLeft() {
    document.execCommand("justifyLeft");
}
function justifyCenter() {
    document.execCommand("justifyCenter");
}
function justifyRight() {
    document.execCommand("justifyRight");
}
function surligne(color) {
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Si le texte est déjà surligné, retire le style
        color = hexToRgb(color);
        color = color.replace("rgb", "rgba").replace(")", ", 0.5)");

        if (selection.anchorNode.parentNode.style.backgroundColor === color) {
            document.execCommand("hiliteColor", false, "transparent");
        } else {
            document.execCommand("hiliteColor", false, color);
        }

        // Déclenche manuellement l'événement 'input' pour informer des changements
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        selection.anchorNode.parentNode.dispatchEvent(event);
    }
}

document.getElementsByClassName("div_titre_editor")[0].addEventListener("input", () => {
    document.getElementById("titre_fiche").textContent = document.getElementById("Titre_main").value;
    localStorage.setItem("titre_fiche", document.getElementById("Titre_main").value);
});


function createEditorTexte(id, content, important) {
    const section = document.createElement("div");
    section.className = "div_editor_classic_txt";
    section.setAttribute("id_editor", id);

    const infoEditor = document.createElement("div");
    infoEditor.className = "div_info_editor";

    const typeDiv = document.createElement("div");
    typeDiv.className = "div_type_div";
    const h2 = document.createElement("h2");
    if (important) {
        h2.textContent = "Texte à retenir";
    } else {
        h2.textContent = "Texte";
    }
    typeDiv.appendChild(h2);

    infoEditor.appendChild(typeDiv);
    section.appendChild(infoEditor);

    const headerEditorTxt = document.createElement("div");
    headerEditorTxt.className = "div_header_editor_txt";

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const buttons = [
        { text: "Gras", onclick: "bold()" },
        { text: "Italique", onclick: "italic()" },
        { text: "Souligné", onclick: "underline()" },
        { separator: true },
        { text: "Liste à puces", onclick: "insertUnorderedList()" },
        { text: "Liste numérotée", onclick: "insertOrderedList()" },
        { separator: true },
        { text: "Gauche", onclick: "justifyLeft()" },
        { text: "Centre", onclick: "justifyCenter()" },
        { text: "Droite", onclick: "justifyRight()" },
        { separator: true },
        { text: "Surligné", onclick: "surligne(color)" }

    ];

    buttons.forEach((button) => {
        if (button.separator) {
            const separator = document.createElement("div");
            separator.className = "separateur";
            toolbar.appendChild(separator);
        } else {
            const btn = document.createElement("button");
            btn.textContent = button.text;
            btn.setAttribute("onclick", button.onclick);
            toolbar.appendChild(btn);
        }
    });

    const color_picker = document.createElement("input");
    color_picker.type = "color";
    color_picker.value = color;
    color_picker.addEventListener("input", () => {
        color = color_picker.value;
        surligne(color);

        div_txt.innerHTML = editor.innerHTML;
        localStorage.setItem("editorContent_" + id, editor.innerHTML);
        localStorage.setItem("editorImportant_" + id, important);
    });
    toolbar.appendChild(color_picker);

    headerEditorTxt.appendChild(toolbar);

    const deleteButton = document.createElement("button");
    deleteButton.id = "suprim";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", () => {
        section.remove();
        document.querySelector(`[id_txt_fiche="${id}"]`).remove();
        localStorage.removeItem("editorContent_" + id);
        localStorage.removeItem("editorImportant_" + id);
    });
    headerEditorTxt.appendChild(deleteButton);


    section.appendChild(headerEditorTxt);

    const editor = document.createElement("div");
    editor.className = "editor";
    editor.setAttribute("contenteditable", "true");
    editor.setAttribute("data-placeholder", "Écrivez ici");
    section.appendChild(editor);
    editor.innerHTML = content;

    document.getElementsByClassName("div_editor_elem")[0]
        .appendChild(section);

    // ajout de l'espace texte dans la fiche
    const div_fiche = document.getElementsByClassName("div_fiche")[0];
    let div_txt = document.createElement("div");
    div_txt.className = "div_txt_fiche";

    if (important) {
        div_txt.classList.add("important");
    }

    div_txt.setAttribute("id_txt_fiche", id);
    div_txt.innerHTML = content;
    div_fiche.appendChild(div_txt);

    // modification de la fiche en fonction de l'éditeur
    editor.addEventListener("keydown", function (event) {
        if (event.key === "Tab") {
            event.preventDefault(); // Empêche le comportement par défaut (changement d'élément)

            // Crée un espace insécable
            const space = document.createTextNode("\t");
            const range = document.getSelection().getRangeAt(0);

            // Insère l'espace à la position actuelle du curseur
            range.deleteContents(); // Supprime tout ce qui est sélectionné (si nécessaire)
            range.insertNode(space);

            // Déplace le curseur après l'espace inséré
            range.setStartAfter(space);
            range.collapse(true);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // Met à jour le contenu de la fiche
            div_txt.innerHTML = editor.innerHTML;
            localStorage.setItem("editorContent_" + id, editor.innerHTML);

        }
    });

    editor.addEventListener("input", () => {
        div_txt.innerHTML = editor.innerHTML;

        //scroll to the element in the fiche
        let val = (div_txt.offsetTop+div_txt.offsetHeight/2) - (document.querySelector(".div_fiche").offsetHeight / 2);
        document.querySelector(".div_fiche").scrollTo({
            top: val,
            behavior: 'smooth'
        });

        localStorage.setItem("editorContent_" + id, editor.innerHTML);
        localStorage.setItem("editorImportant_" + id, important);
    });
    liste_key_local_storage.push("editorContent_" + id);
    liste_key_local_storage.push("editorImportant_" + id);

}

function createEditorTitre(id, content, type_) {
    const section = document.createElement("div");
    section.className = "div_editor_titre_txt";
    section.setAttribute("id_editor", id);

    const infoEditor = document.createElement("div");
    infoEditor.className = "div_info_editor";

    const typeDiv = document.createElement("div");
    typeDiv.className = "div_type_div";
    const h2 = document.createElement("h2");
    h2.textContent = "Titre";
    typeDiv.appendChild(h2);

    infoEditor.appendChild(typeDiv);
    section.appendChild(infoEditor);



    const headerEditorTxt = document.createElement("div");
    headerEditorTxt.className = "div_header_editor_txt";

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const editorTypeSelect = document.createElement("select");
    editorTypeSelect.id = "editorType";

    const liste_type = ["Titre 1", "Titre 2", "Titre 3", "Titre 4", "Titre 5", "Titre 6", "Normal"];

    liste_type.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        editorTypeSelect.appendChild(option);
    });

    if (type_) {
        editorTypeSelect.value = type_;
    } else {
        editorTypeSelect.value = "Normal";
    }


    toolbar.appendChild(editorTypeSelect);

    headerEditorTxt.appendChild(toolbar);

    const deleteButton = document.createElement("button");
    deleteButton.id = "suprim";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", () => {
        section.remove();
        document.querySelector(`[id_titre_fiche="${id}"]`).remove();
        localStorage.removeItem("editorContentTitre_" + id);
        localStorage.removeItem("editorTypeTitre_" + id);
    });
    headerEditorTxt.appendChild(deleteButton);

    section.appendChild(headerEditorTxt);

    const editor = document.createElement("div");
    editor.className = "editor";
    editor.setAttribute("contenteditable", "true");
    section.appendChild(editor);
    editor.innerHTML = content;

    document.getElementsByClassName("div_editor_elem")[0]
        .appendChild(section);

    // ajout de l'espace titre dans la fiche
    const div_fiche = document.getElementsByClassName("div_fiche")[0];
    let div_titre = document.createElement("div");
    div_titre.className = "div_titre_fiche";
    div_titre.setAttribute("id_titre_fiche", id);
    div_titre.innerHTML = content;
    div_fiche.appendChild(div_titre);

    // modification de la fiche en fonction de l'éditeur
    editor.addEventListener("input", () => {
        div_titre.innerHTML = editor.innerHTML;
        let val = (div_titre.offsetTop+div_titre.offsetHeight/2) - (document.querySelector(".div_fiche").offsetHeight / 2);
        document.querySelector(".div_fiche").scrollTo({
            top: val,
            behavior: 'smooth'
        });
        localStorage.setItem("editorContentTitre_" + id, editor.innerHTML);

    });

    function changeTitre() {
        const type = editorTypeSelect.value;
        editor.classList.remove("titre1", "titre2", "titre3", "titre4", "titre5", "titre6", "normal");
        editor.classList.add(type.toLowerCase().replace(" ", ""));
        div_titre.innerHTML = editor.innerHTML;
        div_titre.classList.remove("titre1", "titre2", "titre3", "titre4", "titre5", "titre6", "normal");
        div_titre.classList.add(type.toLowerCase().replace(" ", ""));
        localStorage.setItem("editorContentTitre_" + id, editor.innerHTML);
        localStorage.setItem("editorTypeTitre_" + id, type);
    }

    //selection du type de titre
    editorTypeSelect.addEventListener("change", () => {
        changeTitre()
    });
    changeTitre()

    liste_key_local_storage.push("editorContentTitre_" + id);
    liste_key_local_storage.push("editorTypeTitre_" + id);

}

function createEditorDefinition(id, mot, content) {
    const section = document.createElement("div");
    section.className = "div_editor_definition_txt";
    section.setAttribute("id_editor", id);

    const infoEditor = document.createElement("div");
    infoEditor.className = "div_info_editor";

    const typeDiv = document.createElement("div");
    typeDiv.className = "div_type_div";
    const h2 = document.createElement("h2");
    h2.textContent = "Définition";
    typeDiv.appendChild(h2);

    infoEditor.appendChild(typeDiv);
    section.appendChild(infoEditor);

    const defInput = document.createElement("div");
    defInput.className = "div_def_input";

    const inputMot = document.createElement("input");
    inputMot.type = "text";
    inputMot.id = "mot";
    inputMot.placeholder = "Mot à définir";
    inputMot.value = mot;

    const editor = document.createElement("div");
    editor.className = "editor";
    editor.id = "definition";
    editor.setAttribute("contenteditable", "true");
    editor.setAttribute("data-placeholder", "Définition");
    editor.innerHTML = content;

    const headerEditorTxt = document.createElement("div");
    headerEditorTxt.className = "div_header_editor_txt";



    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const buttons = [
        { text: "Gras", onclick: "bold()" },
        { text: "Italique", onclick: "italic()" },
        { text: "Souligné", onclick: "underline()" },
        { separator: true },
        { text: "Liste à puces", onclick: "insertUnorderedList()" },
        { text: "Liste numérotée", onclick: "insertOrderedList()" },
        { separator: true },
        { text: "Gauche", onclick: "justifyLeft()" },
        { text: "Centre", onclick: "justifyCenter()" },
        { text: "Droite", onclick: "justifyRight()" },
        { separator: true },
        { text: "Surligné", onclick: "surligne(color)" }

    ];

    buttons.forEach((button) => {
        if (button.separator) {
            const separator = document.createElement("div");
            separator.className = "separateur";
            toolbar.appendChild(separator);
        } else {
            const btn = document.createElement("button");
            btn.textContent = button.text;
            btn.setAttribute("onclick", button.onclick);
            toolbar.appendChild(btn);
        }
    });

    const color_picker = document.createElement("input");
    color_picker.type = "color";
    color_picker.value = color;
    color_picker.addEventListener("input", () => {
        color = color_picker.value;
        div_def.innerHTML = `<strong>${inputMot.value}:</strong> <div id="def">${editor.innerHTML}</div>`;
        localStorage.setItem("editorContentDef_" + id, '<div id="def">' + editor.innerHTML + '</div>');
        localStorage.setItem("editorMotDef_" + id, inputMot.value);
    });
    toolbar.appendChild(color_picker);

    headerEditorTxt.appendChild(toolbar);

    const deleteButton = document.createElement("button");
    deleteButton.id = "suprim";
    deleteButton.textContent = "Supprimer";
    deleteButton.addEventListener("click", () => {
        section.remove();
        if (document.querySelector(`[id_def_fiche="${id}"]`).parentElement.children.length == 1) {
            document.querySelector(`[id_def_fiche="${id}"]`).parentElement.remove();
        } else {
            document.querySelector(`[id_def_fiche="${id}"]`).remove();
        }
        localStorage.removeItem("editorContentDef_" + id);
        localStorage.removeItem("editorMotDef_" + id);
    });
    headerEditorTxt.appendChild(deleteButton);

    defInput.appendChild(inputMot);
    defInput.appendChild(editor);
    section.appendChild(headerEditorTxt);
    section.appendChild(defInput);
    document.getElementsByClassName("div_editor_elem")[0].appendChild(section);

    // ajout de l'espace définition dans la fiche
    const div_fiche = document.getElementsByClassName("div_fiche")[0];
    let div_def = document.createElement("div");
    div_def.className = "div_def_fiche";
    div_def.setAttribute("id_def_fiche", id);
    if (mot) {
        div_def.innerHTML = `<strong>${mot}:</strong><br>${content}`;
    } else {
        div_def.innerHTML = `${content}`;
    }
    div_fiche.appendChild(div_def);


    editor.addEventListener("keydown", function (event) {
        if (event.key === "Tab") {
            event.preventDefault(); // Empêche le comportement par défaut (changement d'élément)

            // Crée un espace insécable
            const space = document.createTextNode("\t");
            const range = document.getSelection().getRangeAt(0);

            // Insère l'espace à la position actuelle du curseur
            range.deleteContents(); // Supprime tout ce qui est sélectionné (si nécessaire)
            range.insertNode(space);

            // Déplace le curseur après l'espace inséré
            range.setStartAfter(space);
            range.collapse(true);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // Met à jour le contenu de la fiche
            div_txt.innerHTML = editor.innerHTML;
            div_def.innerHTML = `<strong>${inputMot.value}:</strong> <div id="def">${editor.innerHTML}</div>`;
            localStorage.setItem("editorContentDef_" + id, '<div id="def">' + editor.innerHTML + '</div>');
            localStorage.setItem("editorMotDef_" + id, inputMot.value);

        }
    });


    // modification de la fiche en fonction de l'éditeur
    editor.addEventListener("input", () => {
        div_def.innerHTML = `<strong>${inputMot.value}:</strong> <div id="def">${editor.innerHTML}</div>`;
        let val = (div_def.offsetTop+div_def.offsetHeight/2) - (document.querySelector(".div_fiche").offsetHeight / 2);
        document.querySelector(".div_fiche").scrollTo({
            top: val,
            behavior: 'smooth'
        });
        localStorage.setItem("editorContentDef_" + id, '<div id="def">' + editor.innerHTML + '</div>');
        localStorage.setItem("editorMotDef_" + id, inputMot.value);
    });

    inputMot.addEventListener("input", () => {
        div_def.innerHTML = `<strong>${inputMot.value}:</strong> <div id="def">${editor.innerHTML}</div>`;

        let val = (div_def.offsetTop+div_def.offsetHeight/2) - (document.querySelector(".div_fiche").offsetHeight / 2);
        document.querySelector(".div_fiche").scrollTo({
            top: val,
            behavior: 'smooth'
        });
        
        localStorage.setItem("editorMotDef_" + id, inputMot.value);
    });
    liste_key_local_storage.push("editorContentDef_" + id);
    liste_key_local_storage.push("editorMotDef_" + id);
}

function Change_title_color(color, id_elem) {
    const styleSheet = document.styleSheets[0]; // La première feuille de style de la page
    styleSheet.insertRule(`#${id_elem} .div_def_fiche.first::before { color: ${color} !important; }`, styleSheet.cssRules.length);
    localStorage.setItem("titreColor" + id_elem, color);

    if (!liste_key_local_storage.includes("titreColor" + id_elem)) {
        liste_key_local_storage.push("titreColor" + id_elem);
    }
}

function add_fond(elem, important = -1) {
    if (!elem) {
        return;
    }
    let id_elem = elem.getAttribute("id");

    if (important == 1) {
        elem.classList.add("important");
        localStorage.setItem("titreEmportant" + id_elem, 1);
    } else if (important == 0) {
        elem.classList.remove("important");
        localStorage.setItem("titreEmportant" + id_elem, 0);
    } else {
        if (elem.classList.contains("important")) {
            elem.classList.remove("important");
            localStorage.setItem("titreEmportant" + id_elem, 0);
        } else {
            elem.classList.add("important");
            localStorage.setItem("titreEmportant" + id_elem, 1);
        }
    }


    if (!liste_key_local_storage.includes("titreEmportant" + id_elem)) {
        liste_key_local_storage.push("titreEmportant" + id_elem);
    }
}

function change_def_style(elem) {
    let notif_ = document.querySelector(".notif");
    if (notif_) {
        notif_.style.animation = "hide_notif 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards";
        notif_.classList.remove("show_notif");
        setTimeout(() => {
            notif_.remove();
        }, 600);
    }

    //get la position de l'element dans la page
    let position = elem.getBoundingClientRect();
    let id_elem = elem.id;
    let notif = document.createElement("div");
    notif.className = "notif";
    // deplacer la bulle vers la souris
    notif.style.display = "flex";
    notif.classList.add("show_notif");
    notif.style.top = position.top + "px";
    notif.style.left = position.left + "px";
    notif.style.animation = "show_notif 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards";

    buttons = [
        { text: "Fond", onclick: "add_fond(elem)" },
        { separator: true },
        { color: true, name: "titre_color" }
    ];

    buttons.forEach((button) => {
        if (button.separator) {
            const separator = document.createElement("div");
            separator.className = "separateur";
            notif.appendChild(separator);
        } else if (button.color) {
            const color_picker = document.createElement("input");
            color_picker.type = "color";
            color_picker.value = color;
            color_picker.setAttribute("name", button.name);
            color_picker.addEventListener("input", () => {
                const selectedColor = color_picker.value;
                Change_title_color(selectedColor, id_elem);
            });
            notif.appendChild(color_picker);
        }
        else {
            const btn = document.createElement("button");
            btn.textContent = button.text;
            btn.addEventListener("click", () => {
                add_fond(elem);
            });
            notif.appendChild(btn);
        }
    });

    document.body.appendChild(notif);

}

function update() {
    let div_fiche = document.querySelector(".div_fiche");
    let children = Array.from(div_fiche.children); // Convertir en tableau pour faciliter la manipulation
    let consecutiveDivDefFicheCount = 0;
    let element_before = null;
    let last_div_def_fiche = null;
    let liste_def = [];

    for (let i = 0; i < children.length; i++) {
        if (children[i].classList.contains("div_def_fiche")) {
            consecutiveDivDefFicheCount++;
            if (consecutiveDivDefFicheCount === 2) {
                last_div_def_fiche.classList.add("first");
                children[i].classList.remove("first");
            } else if (consecutiveDivDefFicheCount === 1) {
                if (children[i].previousElementSibling && children[i].previousElementSibling.classList.contains("div_defs_fiche")) {
                    children[i].previousElementSibling.appendChild(children[i]);
                } else {
                    children[i].classList.add("first");
                }
            }

            if (!element_before) {
                element_before = children[i - 1];
            }
            last_div_def_fiche = children[i];
            liste_def.push(children[i]);
        }
        else {
            // Traitement lorsque l'élément n'est pas une définition
            if (liste_def.length > 0) {
                const deff = document.createElement("div");
                deff.id = "defGroup_" + i;
                deff.className = "div_defs_fiche";
                deff.addEventListener("click", () => {
                    change_def_style(deff);
                });

                for (let j = 0; j < liste_def.length; j++) {
                    deff.appendChild(liste_def[j]);
                }

                if (deff.children.length >= 1) {
                    if (element_before) {
                        div_fiche.insertBefore(deff, element_before.nextSibling);
                    } else {
                        div_fiche.appendChild(deff); // Ajouter à la fin si aucun élément avant
                    }
                }
            }
            // Réinitialisation pour la prochaine série de définitions
            consecutiveDivDefFicheCount = 0;
            element_before = null;
            last_div_def_fiche = null;
            liste_def = [];
        }
    }

    // Traitement pour le dernier groupe de définitions s'il existe
    if (liste_def.length > 0) {
        const deff = document.createElement("div");
        deff.id = "defGroup_" + (children.length + 1);
        deff.className = "div_defs_fiche";
        deff.addEventListener("click", () => {
            change_def_style(deff);
        });

        for (let j = 0; j < liste_def.length; j++) {
            deff.appendChild(liste_def[j]);
        }

        if (element_before) {
            div_fiche.insertBefore(deff, element_before.nextSibling);
        } else {
            div_fiche.appendChild(deff); // Ajouter à la fin si aucun élément avant
        }
    }


    // suprimer les hilight qui ne sont plus actif
    for (let i = 0; i < liste_key_local_storage.length; i++) {
        let key = liste_key_local_storage[i];
        if (key.includes("texteSurligne_")) {
            let id = key.split("_")[1];
            let elem = document.querySelector(".texteSurligne_" + id);
            if (!elem) {
                liste_key_local_storage.splice(i, 1);
            }
        }
    }

}

document.addEventListener("input", () => {
    update()
    is_changed = true;
});

window.addEventListener("resize", () => {
    update();
});

window.addEventListener("click", (e) => {
    if (e.target.closest(".div_defs_fiche") || e.target.closest(".notif")) {
        return;
    }

    let notif_ = document.querySelector(".notif");
    if (notif_) {
        notif_.style.animation = "hide_notif 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards";
        notif_.classList.remove("show_notif");
        setTimeout(() => {
            notif_.remove();
        }, 600);
    }
});

document.querySelector(".div_fiche").addEventListener("scroll", () => {
    let notif_ = document.querySelector(".notif");
    if (notif_) {
        notif_.style.animation = "hide_notif 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards";
        notif_.classList.remove("show_notif");
        setTimeout(() => {
            notif_.remove();
        }, 600);
    }
});

async function save(id, inner_html, local_storage, automatic = false) {
    if (!is_charged) {
        return;
    }
    let commentaire = "Mise à jour";
    if (automatic) {
        commentaire = "Sauvegarde automatique";
    }

    const response = await fetch("http://192.168.1.74:3000/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, inner_html, local_storage, commentaire }),
    });
    const data = await response.text();
    if (response.ok) {
        if (!automatic) {
            notif_txt("Sauvegarde en cours...");
        }
        is_changed = false;
        let date = JSON.parse(data).date;
        // format : 2024-10-30T14:06:36.000Z => 30/10/2024 14:06:36 and time between now and the save
        date_save = new Date(date);
    } else if (response.status === 401) {
        document.body.style.pointerEvents = 'none';
        notif_permant_show("Vous devez vous connecter pour sauvegarder");
        // ouvre un nouvel onglet avec la page de login
        let newTab = window.open("http://192.168.1.74:3000/connexion", "_blank");
        newTab.focus();

        const intervalId = setInterval(() => {
            if (newTab.closed) {
                clearInterval(intervalId);
                newTab.close();
                document.body.style.pointerEvents = 'auto';
                document.getElementsByClassName("btn_save_div")[0].click();
                notif_permant_hide();
                return;
            }
            if (document.cookie.includes("token")) {
                clearInterval(intervalId);
                newTab.close();
                document.body.style.pointerEvents = 'auto';
                document.getElementsByClassName("btn_save_div")[0].click();
                notif_permant_hide();

                return;
            }
        }, 500);

    }

}

document.getElementsByClassName("btn_save_div")[0].addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);
    let id = params.get("id");
    // Récupérer toutes les données du localStorage

    let local_storage = "";
    for (let i = 0; i < liste_key_local_storage.length; i++) {
        let key = liste_key_local_storage[i];
        let value = localStorage.getItem(key);
        if (value) {
            local_storage += key + "===" + value + ";;;";
        }
    }
    let div_fiche = document.querySelector(".div_fiche_main");
    save(id, div_fiche.innerHTML, local_storage);
});

async function LoadFiche() {
    const params = new URLSearchParams(window.location.search);
    let id = params.get("id");
    const response = await fetch("http://192.168.1.74:3000/getData", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (response.ok) {
        //supression de tout localstorage
        localStorage.clear();
        // ajout de la fiche dans le localstorage
        let fiche = data.data[0];
        let info = data.info;
        localStorage.setItem("Groupe", info.groupe_id);
        liste_key_local_storage.push("Groupe");
        document.getElementById('select_groupe').value = info.groupe_id;

        let local_storage = fiche.local_storage;
        date_save = new Date(fiche.date_modification);
        local_storage = local_storage.split(";;;");
        for (let i = 0; i < local_storage.length; i++) {
            let key = local_storage[i].split('===')[0];
            let value = local_storage[i].split('===')[1];
            localStorage.setItem(key, value);
        }
    } else if (response.status === 401) {
        document.open();
        document.write(data);
        document.close();
    }

    id = localStorage.getItem("nb_editor") || 0;
    for (let i = 0; i < parseInt(id) + 1; i++) {
        const savedContent = localStorage.getItem("editorContent_" + i);
        if (savedContent) {
            let important = localStorage.getItem("editorImportant_" + i);
            important = parseInt(important);
            createEditorTexte(i, savedContent, important);
        }
        const savedContentTitre = localStorage.getItem("editorContentTitre_" + i);
        if (savedContentTitre) {
            let type = localStorage.getItem("editorTypeTitre_" + i);
            createEditorTitre(i, savedContentTitre, type);
        }
        const savedMotDef = localStorage.getItem("editorMotDef_" + i);
        if (savedMotDef) {
            let content = localStorage.getItem("editorContentDef_" + i);
            if (!content) {
                content = "";
            }
            createEditorDefinition(i, savedMotDef, content);
        }
    }
    update();

    document.getElementById("titre_fiche").textContent = localStorage.getItem("titre_fiche");
    document.getElementById("Titre_main").value = localStorage.getItem("titre_fiche");
    liste_key_local_storage.push("titre_fiche");

    document.querySelectorAll(".div_loader").forEach((elem) => {
        elem.remove();
    });
    is_charged = true;

    setTimeout(() => {
        for (let j = 0; j < parseInt(id) + 1; j++) {
            const savedColor = localStorage.getItem("titreColordefGroup_" + j);
            if (savedColor) {
                Change_title_color(savedColor, "defGroup_" + j);
            }
            const savedEmportant = localStorage.getItem("titreEmportantdefGroup_" + j);
            if (savedEmportant) {
                add_fond(document.getElementById("defGroup_" + j), parseInt(savedEmportant));
            }
            const savedColorhilight = localStorage.getItem("texteSurligne_" + j);
            if (savedColorhilight) {
                const styleSheet = document.styleSheets[0]; // La première feuille de style de la page
                styleSheet.insertRule(`.texteSurligne_${j}::before { background-color: ${savedColorhilight} !important; }`, styleSheet.cssRules.length);
                styleSheet.insertRule(`.texteSurligne_${j} { background-color: ${savedColorhilight} !important; }`, styleSheet.cssRules.length);
                liste_key_local_storage.push("texteSurligne_" + j);
            }
        }

        setTimeout(() => {
            // Sélectionner la div parent
            let elem = document.querySelector(".div_fiche");
            let lastChild = elem.lastElementChild;
        
            if (lastChild) {
                // Faire défiler le dernier enfant au centre de la div parent
                let val = lastChild.offsetTop - (elem.offsetHeight / 2);

                elem.scrollTo({
                    top: val,
                    behavior: 'smooth'
                });

            }

            let elem_editor = document.querySelector(".div_editor_section_main");
            let lastChild_editor = elem_editor.lastElementChild;

            if (lastChild_editor) {
                // Faire défiler le dernier enfant au centre de la div parent
                let val = lastChild_editor.offsetTop - (elem_editor.offsetHeight / 2);

                elem_editor.scrollTo({
                    top: val,
                    behavior: 'smooth'
                });
            }
        

        }, 10);
        

    }, 10);
    update();
}

function notif_txt(txt) {
    let div_notif = document.querySelector(".div_notification");
    div_notif.querySelector("h2").textContent = txt;
    div_notif.style.transform = "translateX(50%)";
    setTimeout(() => {
        div_notif.style.transform = "translateX(50%) translateY(-410px)";
    }, 2000);
}

async function get_header() {
    const response = await fetch("http://192.168.1.74:3000/header", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    });
    const data = await response.text();
    if (response.ok) {
        document.querySelector("header").innerHTML = data;
    } else if (response.status === 401) {
        document.querySelector("header").innerHTML = data;
    }
}
get_header();

function notif_permant_show(txt) {
    let div_notif = document.querySelector(".div_notification");
    div_notif.querySelector("h2").textContent = txt;
    div_notif.style.transform = "translateX(50%)";
}
function notif_permant_hide() {
    let div_notif = document.querySelector(".div_notification");
    div_notif.style.transform = "translateX(50%) translateY(-410px)";
}

setTimeout(() => {
    LoadFiche();
}, 2000);

setInterval(() => {
    if (!is_changed) {
        return;
    }
    const params = new URLSearchParams(window.location.search);
    let id = params.get("id");
    // Récupérer toutes les données du localStorage

    let local_storage = "";
    console.log(liste_key_local_storage);
    for (let i = 0; i < liste_key_local_storage.length; i++) {
        let key = liste_key_local_storage[i];
        let value = localStorage.getItem(key);
        if (value) {
            local_storage += key + "===" + value + ";;;";
        }
    }
    let div_fiche = document.querySelector(".div_fiche_main");
    save(id, div_fiche.innerHTML, local_storage, true);
}, 10000);

setInterval(() => {
    if (!is_charged) {
        return;
    }
    if (isNaN(date_save)) {
        return;
    }

    let date_now = new Date();
    let diff = date_now - date_save;
    //passer en seconde
    diff = diff / 1000;
    if (diff > 60) {
        diff = diff / 60;
        if (diff > 60) {
            diff = diff / 60;
            if (diff > 24) {
                diff = diff / 24;
                document.querySelector(".div_time_save").textContent = "Dernière sauvegarde : " + Math.round(diff) + " jours";
            } else {
                document.querySelector(".div_time_save").textContent = "Dernière sauvegarde : " + Math.round(diff) + " heures";
            }
        } else {
            document.querySelector(".div_time_save").textContent = "Dernière sauvegarde : " + Math.round(diff) + " minutes";
        }
    }
    else {
        document.querySelector(".div_time_save").textContent = "Dernière sauvegarde : " + Math.round(diff) + " secondes";
    }

}, 1000);
// Fonction pour charger une nouvelle page
function loadPage(url_) {
    fetch(url_)
        .then(response => response.text())
        .then(html => {
            document.open();
            document.write(html);
            document.close();
        })
        .catch(error => console.error('Erreur de chargement de la page:', error));
}

// Ajouter un nouvel état à l'historique
function navigateTo(url_) {
    history.pushState(null, '', url_);
    loadPage(url_);
}

// Écouter l'événement popstate
window.addEventListener('popstate', (event) => {
    loadPage(location.pathname);
});


let selectedText = '';
let selectionRange = null;

document.getElementById('togglePicker').addEventListener('click', (e) => {
    e.preventDefault();
    const picker = document.getElementById('colorPicker');

    // Sauvegarder la sélection actuelle
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        selectedText = selection.toString();
        selectionRange = selection.getRangeAt(0);
    }

    // Positionner et afficher le color picker
    picker.style.display = picker.style.display === 'none' || picker.style.display === '' ? 'block' : 'none';
    if (picker.style.display === 'block') {
        picker.style.left = `${e.pageX}px`;
        picker.style.top = `${e.pageY}px`;
    }
});

// Gestion des couleurs prédéfinies
document.querySelectorAll('.color-box').forEach(box => {
    box.addEventListener('click', function () {
        applyHighlight(this.style.backgroundColor);
    });
});

// Gestion de la couleur personnalisée
document.getElementById('customColor').addEventListener('change', function () {
    applyHighlight(this.value);
});


document.addEventListener('click', (e) => {
    const picker = document.getElementById('colorPicker');
    const toggleBtn = document.getElementById('togglePicker');

    if (!picker.contains(e.target) && e.target !== toggleBtn) {
        picker.style.display = 'none';
    }
});
