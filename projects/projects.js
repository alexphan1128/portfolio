import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON("../lib/projects.json");

const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");
const searchInput = document.querySelector(".searchBar");
const svg = d3.select("#projects-pie-plot");
const legend = d3.select(".legend");

let query = "";
let selectedYear = null;

function getVisibleProjects() {
  return projects.filter((project) => {
    const values = Object.values(project).join(" ").toLowerCase();

    const matchesSearch = values.includes(query.toLowerCase());
    const matchesYear =
      selectedYear === null ||
      String(project.year) === String(selectedYear);

    return matchesSearch && matchesYear;
  });
}

function renderPieChart(projectsToDisplay) {
  svg.selectAll("path").remove();
  legend.selectAll("*").remove();

  const rolledData = d3.rollups(
    projectsToDisplay,
    (values) => values.length,
    (project) => project.year,
  );

  const data = rolledData.map(([year, count]) => ({
    value: count,
    label: year,
  }));

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const sliceGenerator = d3
    .pie()
    .value((d) => d.value);

  const arcGenerator = d3
    .arc()
    .innerRadius(0)
    .outerRadius(50);

  const arcData = sliceGenerator(data);

  svg
    .selectAll("path")
    .data(arcData)
    .join("path")
    .attr("d", arcGenerator)
    .attr("fill", (_, index) => colors(index))
    .attr("class", (d) =>
      String(d.data.label) === String(selectedYear)
        ? "selected"
        : "",
    )
    .on("click", (_, d) => {
      selectedYear =
        String(selectedYear) === String(d.data.label)
          ? null
          : d.data.label;

      updatePage();
    });

  data.forEach((d, index) => {
    legend
      .append("li")
      .attr(
        "class",
        String(d.label) === String(selectedYear)
          ? "selected"
          : "",
      )
      .html(`
        <span
          class="swatch"
          style="
            display: inline-block;
            width: 0.8em;
            height: 0.8em;
            background-color: ${colors(index)};
            border-radius: 50%;
          "
        ></span>
        ${d.label} <em>(${d.value})</em>
      `)
      .on("click", () => {
        selectedYear =
          String(selectedYear) === String(d.label)
            ? null
            : d.label;

        updatePage();
      });
  });
}

function updatePage() {
  const visibleProjects = getVisibleProjects();

  renderProjects(
    visibleProjects,
    projectsContainer,
    "h2",
  );

  projectsTitle.textContent =
    `Projects (${visibleProjects.length})`;

  renderPieChart(visibleProjects);
}

searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  updatePage();
});

updatePage();