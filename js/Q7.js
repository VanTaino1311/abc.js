(async function () {
    const rawData = await d3.csv("../data/data_ggsheet.csv", d => ({
      maNhom: d["Mã nhóm hàng"],
      tenNhom: d["Tên nhóm hàng"],
      maDon: d["Mã đơn hàng"]
    }));
  
    // Đếm tổng số đơn hàng duy nhất trong toàn bộ dataset (mẫu số)
    const totalDistinctOrders = new Set(rawData.map(d => d.maDon)).size;
  
    // Gom nhóm: Nhóm hàng = "[Mã] Tên", đếm số đơn hàng duy nhất mỗi nhóm
    const grouped = d3.rollups(
      rawData,
      v => ({
        soDonBan: new Set(v.map(d => d.maDon)).size
      }),
      d => `[${d.maNhom}] ${d.tenNhom}`
    ).map(([nhom, val]) => ({
      nhom,
      soDonBan: val.soDonBan,
      xacsuat: +(val.soDonBan / totalDistinctOrders * 100).toFixed(1) // tính % theo Tableau
    }));
  
    // Sắp xếp giảm dần theo xác suất
    grouped.sort((a, b) => d3.descending(a.xacsuat, b.xacsuat));
  
    const margin = { top: 50, right: 40, bottom: 60, left: 200 };
    const svgWidth = 1000, svgHeight = 600;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
  
    const svg = d3.select("#chart")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const y = d3.scaleBand()
      .domain(grouped.map(d => d.nhom))
      .range([0, height])
      .padding(0.3);
  
    const x = d3.scaleLinear()
      .domain([0, d3.max(grouped, d => d.xacsuat)]).nice()
      .range([0, width]);
  
    const color = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(grouped.map(d => d.nhom));
  
    // Axes
    svg.append("g").call(d3.axisLeft(y));
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => d + "%"));
  
    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  
    // Bars
    svg.selectAll("rect")
      .data(grouped)
      .enter()
      .append("rect")
      .attr("y", d => y(d.nhom))
      .attr("x", 0)
      .attr("height", y.bandwidth())
      .attr("width", d => x(d.xacsuat))
      .attr("fill", d => color(d.nhom))
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <b>Nhóm hàng:</b> ${d.nhom}<br/>
          <b>SL đơn bán:</b> ${d3.format(",")(d.soDonBan)}<br/>
          <b>Xác suất:</b> ${d.xacsuat}%
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
  
    // Label %
    svg.selectAll(".label")
      .data(grouped)
      .enter()
      .append("text")
      .attr("x", d => x(d.xacsuat) + 5)
      .attr("y", d => y(d.nhom) + y.bandwidth() / 2)
      .attr("alignment-baseline", "middle")
      .text(d => d.xacsuat + "%")
      .style("font-size", "12px")
      .style("fill", "#111827");
  
    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("fill", "#1f2937")
      .style("font-weight", "bold")
      .text("Xác suất bán hàng theo nhóm hàng");
  })();
  