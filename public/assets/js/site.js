// desilon.nl: three small jobs for the sign-up form. No tracking, no cookies.
(function () {
  "use strict";

  var forms = document.querySelectorAll("form.signup");
  if (!forms.length) return;

  // 1. Where the visitor came from: the short path (/tt, /ig, /yt pass ?utm_source= on).
  var bySource = { tt: "TikTok", tiktok: "TikTok", ig: "Instagram", instagram: "Instagram", yt: "YouTube", youtube: "YouTube" };
  var key = window.location.pathname.replace(/\//g, "").toLowerCase();
  var params = new URLSearchParams(window.location.search);
  var source = bySource[key] || bySource[(params.get("utm_source") || "").toLowerCase()];
  if (source) {
    document.querySelectorAll("[data-source]").forEach(function (el) { el.value = source; });
    document.querySelectorAll("[data-source-field]").forEach(function (el) { el.hidden = true; });
  }

  forms.forEach(function (form) {
    var notice = form.querySelector(".notice");
    var button = form.querySelector("[type=submit]");
    var say = function (text) { if (notice) { notice.textContent = text; notice.hidden = false; } };

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      // 2. Until the form is connected to MailerLite (README, "Connect the form"), don't send.
      if (form.getAttribute("data-connected") !== "true") {
        say("Sign-ups open in a few days. Follow us on TikTok, Instagram or YouTube to hear first.");
        return;
      }

      // 3. Send it to MailerLite ourselves: it answers with JSON ({success, errors}), which its own script
      //    would normally read; without it the browser would show the raw JSON. Success goes to our thanks page.
      if (button) button.disabled = true;
      fetch(form.action, { method: "POST", body: new URLSearchParams(new FormData(form)), credentials: "omit" })
        .then(function (response) { if (!response.ok) throw new Error(response.status); return response.json(); })
        .then(function (data) {
          if (data && data.success) { window.location.href = "/thanks"; return; }
          if (button) button.disabled = false;
          var emailError = data && data.errors && data.errors.fields && data.errors.fields.email;
          say(emailError ? "That email address doesn't look right. Check it and try again." : "That didn't go through. Try again, or mail contact@desilon.nl.");
        })
        .catch(function () {
          if (button) button.disabled = false;
          say("That didn't go through. Try again, or mail contact@desilon.nl.");
        });
    });
  });
})();
