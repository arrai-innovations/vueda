document.getElementById("user-filter").addEventListener("change", function () {
    this.form.submit();
});

document.querySelector(".back-to-top").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
});
