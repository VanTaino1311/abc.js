(async function () {
    const rawData = await d3.csv("../data/data_ggsheet.csv", d => ({
      ngayTao: new Date(d["Thời gian tạo đơn"]),
      sl: +d["SL"],
      thanhtien: +d["Thành tiền"]
    }));
  
    // Map tháng
    const monthNames = [
      "Tháng 01","Tháng 02","Tháng 03","Tháng 04","Tháng 05","Tháng 06",
      "Tháng 07","Tháng 08","Tháng 09","Tháng 10","Tháng 11","Tháng 12"
    ];
  
    const data = d3.rollups(
      rawData,
      v => ({
        month: monthNames[d3.timeMonth(v[0].ngayTao).getMonth()],
        sumSL: d3.sum(v, d => d.sl),
        sumTien: d3.sum(v, d => d.thanhtien)
      }),
      d => d.ngayTao.getMonth()
    )
    .map(([key, val]) => ({ monthIdx: key, ...val }))
    .sort((a, b) => d3.ascending(a.monthIdx, b.monthIdx));
  
    const margin = { top: 40, right: 50, bottom: 50, left: 80 };
    const svgWidth = 1100, svgHeight = 600;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
  
    const svg = d3.select("#chart")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.3);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.sumTien)]).nice()
      .range([height, 0]);
  
    const color = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(data.map(d => d.month));
  
    // Axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
  
    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));
  
    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  
    // Bars
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.sumTien))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.sumTien))
      .attr("fill", d => color(d.month))
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <b>${d.month}</b><br/>
          <b>Số lượng bán:</b> ${d3.format(",")(d.sumSL)}<br/>
          <b>Doanh số bán:</b> ${Math.round(d.sumTien / 1e6)} Triệu VND
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
  
    // Label giá trị trên bar
    svg.selectAll(".label")
      .data(data)
      .enter()
      .append("text")
      .attr("x", d => x(d.month) + x.bandwidth() / 2)
      .attr("y", d => y(d.sumTien) - 5)
      .attr("text-anchor", "middle")
      .text(d => `${Math.round(d.sumTien / 1e6)} Triệu VND`)
      .style("font-size", "12px")
      .style("fill", "#111827");
  
    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("fill", "#2563eb")
      .style("font-weight", "bold")
      .text("Doanh số bán hàng theo tháng");
  
  })();

