console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `,
);

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "https://github.com/alexphan1128", title: "GitHub" },
];

const nav = document.createElement("nav");
document.body.prepend(nav);

for (let page of pages) {
  let url = page.url;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  let link = document.createElement("a");
  link.href = url;
  link.textContent = page.title;

  if (link.host === location.host && link.pathname === location.pathname) {
    link.classList.add("current");
  }

  if (link.host !== location.host) {
    link.target = "_blank";
  }

  nav.append(link);
}
let select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty(
    "color-scheme",
    colorScheme,
  );

  select.value = colorScheme;
}

select.addEventListener("input", function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}
let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let subject = encodeURIComponent(data.get("subject"));
  let body = encodeURIComponent(data.get("body"));

  let mailto = `mailto:ahp009@ucsd.edu?subject=${subject}&body=${body}`;

  window.location.href = mailto;
});