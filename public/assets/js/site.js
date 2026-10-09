// desilon.nl: two small jobs for the sign-up forms. No tracking, no cookies.
(function () {
  "use strict";

  var forms = document.querySelectorAll("form.signup");
  if (!forms.length) return;

  // 1. "Where did you find us?" comes from the short path (/tt, /ig, /yt pass ?utm_source= on).
  //    When the link already says it, the question is hidden and only sent along.
  var bySource = { tt: "TikTok", tiktok: "TikTok", ig: "Instagram", instagram: "Instagram", yt: "YouTube", youtube: "YouTube" };
  var key = window.location.pathname.replace(/\//g, "").toLowerCase();
  var params = new URLSearchParams(window.location.search);
  var source = bySource[key] || bySource[(params.get("utm_source") || "").toLowerCase()];
  if (source) {
    document.querySelectorAll("[data-source]").forEach(function (el) { el.value = source; });
    document.querySelectorAll("[data-source-field]").forEach(function (el) { el.hidden = true; });
  }

  // 2. Until the forms are connected to Zoho Campaigns (README, "Connect the form"), don't submit.
  forms.forEach(function (form) {
    if (form.getAttribute("data-connected") === "true") return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var notice = form.querySelector(".notice");
      if (notice) notice.hidden = false;
    });
  });
})();
