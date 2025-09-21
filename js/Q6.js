(async function () {
    const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");
  
    const rawData = await d3.csv("../data/data_ggsheet.csv", d => {
      const time = parseDate(d["Thời gian tạo đơn"]);
      return {
        time,
        date: time ? d3.timeDay.floor(time) : null,
        hour: time ? time.getHours() : null,
        sl: +d["SL"],
        thanhtien: +d["Thành tiền"]
      };
    });
  
    // Gom theo giờ
    const grouped = d3.rollups(
      rawData.filter(d => d.hour !== null),
      v => {
        const sumSL = d3.sum(v, d => d.sl);
        const sumTT = d3.sum(v, d => d.thanhtien);
        const uniqueDays = new Set(v.map(d => d.date.getTime())).size;
        const uniqueHours = new Set(v.map(d => d.hour)).size;
  
        return {
          hour: v[0].hour,
          khunggio: `${String(v[0].hour).padStart(2,"0")}:00-${String(v[0].hour).padStart(2,"0")}:59`,
          avgSL: uniqueHours > 0 ? sumSL / uniqueHours : 0,
          avgDoanhThu: uniqueDays > 0 ? sumTT / uniqueDays : 0
        };
      },
      d => d.hour
    ).map(([_, val]) => val);
  
    grouped.sort((a, b) => d3.ascending(a.hour, b.hour));
  
    const margin = { top: 50, right: 40, bottom: 80, left: 80 };
    const svgWidth = 1000, svgHeight = 600;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
  
    const svg = d3.select("#chart")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand()
      .domain(grouped.map(d => d.khunggio))
      .range([0, width])
      .padding(0.2);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(grouped, d => d.avgSL)]).nice()
      .range([height, 0]);
  
    const color = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(grouped.map(d => d.khunggio));
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end");
  
    svg.append("g")
      .call(d3.axisLeft(y));
  
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  
    // Bars
    svg.selectAll("rect")
      .data(grouped)
      .enter()
      .append("rect")
      .attr("x", d => x(d.khunggio))
      .attr("y", d => y(d.avgSL))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.avgSL))
      .attr("fill", d => color(d.khunggio))
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <b>Khung giờ:</b> ${d.khunggio}<br/>
          <b>Doanh số bán TB:</b> ${d3.format(",.0f")(d.avgDoanhThu)} VND<br/>
          <b>Số lượng bán TB:</b> ${d3.format(",.0f")(d.avgSL)}
        `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(300).style("opacity", 0);
      });
  
    // Label
    svg.selectAll(".label")
      .data(grouped)
      .enter()
      .append("text")
      .attr("x", d => x(d.khunggio) + x.bandwidth() / 2)
      .attr("y", d => y(d.avgSL) - 5)
      .attr("text-anchor", "middle")
      .text(d => d3.format(",.0f")(d.avgDoanhThu) + " VND")
      .style("font-size", "12px")
      .style("fill", "#111827");
  
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("fill", "#1f2937")
      .style("font-weight", "bold")
      .text("Doanh số bán hàng trung bình theo khung giờ");
  })();
  