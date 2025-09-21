// js/q12.js
(async function () {
    const rawData = await d3.csv("../data/data_ggsheet.csv", d => ({
      maKH: d["Mã khách hàng"],
      thanhtien: +d["Thành tiền"]
    }));
  
    // 1) Tính tổng chi tiêu theo khách
    const chiTraKH = d3.rollups(
      rawData,
      v => d3.sum(v, d => d.thanhtien),
      d => d.maKH
    ).map(([maKH, tong]) => ({ maKH, tong }));
  
    // 2) Gom nhóm thành bin theo 50.000
    const step = 50000;
    const binned = d3.rollups(
      chiTraKH,
      v => v.length, // số KH trong bin
      d => Math.floor(d.tong / step) * step
    ).map(([lower, count]) => ({
      lower,
      upper: lower + step,
      label: `${d3.format(",")(lower)} - ${d3.format(",")(lower + step)}`,
      count
    })).sort((a, b) => d3.ascending(a.lower, b.lower));
  
    // 3) Vẽ biểu đồ cột
    const margin = { top: 50, right: 30, bottom: 80, left: 80 };
    const svgW = 1200, svgH = 600;
    const width = svgW - margin.left - margin.right;
    const height = svgH - margin.top - margin.bottom;
  
    const root = d3.select("#chart");
    root.selectAll("*").remove();
    root.attr("width", svgW).attr("height", svgH);
    const svg = root.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand()
      .domain(binned.map(d => d.lower))
      .range([0, width])
      .padding(0.2);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(binned, d => d.count)]).nice()
      .range([height, 0]);
  
    // axes X (chỉ hiển thị dạng "50K", "100K"…)
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .tickValues(x.domain().filter((d, i) => i % 2 === 0)) // mỗi 2 bin 1 nhãn
          .tickFormat(d => {
            const k = d / 1000;
            return k >= 1000 ? (d / 1000000) + "M" : k + "K";
          })
      )
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");
  
    svg.append("g").call(d3.axisLeft(y));
  
    // tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  
    // bars
    svg.selectAll("rect.bar")
      .data(binned)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.lower))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.count))
      .attr("fill", "#2563eb")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(
          `<b>Đã chi tiêu:</b> Từ ${d3.format(",")(d.lower)} đến ${d3.format(",")(d.upper)}<br/>
           <b>Số lượng KH:</b> ${d.count}`
        )
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", event => {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));
  
    // title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#2563eb")
      .text("Phân phối mức chi trả của Khách hàng");
  })();
  