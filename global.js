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
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "meta/", title: "Meta" },
  {
    url: "https://github.com/alexphan1128",
    title: "GitHub",
  },
];

const nav = document.createElement("nav");
document.body.prepend(nav);

for (const page of pages) {
  let url = page.url;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  const link = document.createElement("a");
  link.href = url;
  link.textContent = page.title;

  if (
    link.host === location.host &&
    link.pathname === location.pathname
  ) {
    link.classList.add("current");
  }

  if (link.host !== location.host) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  nav.append(link);
}

const select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty(
    "color-scheme",
    colorScheme,
  );

  select.value = colorScheme;
}

select.addEventListener("input", (event) => {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

const form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const subject = encodeURIComponent(data.get("subject"));
  const body = encodeURIComponent(data.get("body"));

  const mailto =
    `mailto:ahp009@ucsd.edu?subject=${subject}&body=${body}`;

  window.location.href = mailto;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch data: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
    return null;
  }
}

export function renderProjects(
  projects,
  containerElement,
  headingLevel = "h2",
) {
  containerElement.innerHTML = "";

  for (const project of projects) {
    const article = document.createElement("article");

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <div>
        <p>${project.description}</p>
        <time datetime="${project.year}">
          ${project.year}
        </time>
      </div>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGithubData(username) {
  return fetchJSON(
    `https://api.github.com/users/${username}`,
  );
}