document.addEventListener("DOMContentLoaded", () => {
  // GSAP Defaults
  const defaultDuration = 0.2;
  const defaultEase = "power2.out";

  gsap.defaults({
    duration: defaultDuration,
    ease: defaultEase,
  });
  // End of GSAP Defaults

  //Global Elements/Functions
  const { apiOrigin, frontOrigin } = window.appConfig;

  const urlParams = new URLSearchParams(window.location.search);
  const boatId = urlParams.get("id");

  const popupDuration = 0.3;

  const pageWrapper = document.querySelector("#page-wrapper");
  const navComponent = pageWrapper.querySelector("#nav-component");
  const headerNav = pageWrapper.querySelector("#header-nav");
  const modelIframe = pageWrapper.querySelector(".model_component");

  const prevOptionBtn = pageWrapper.querySelector("#options-prev-btn");
  const nextOptionBtn = pageWrapper.querySelector("#options-next-btn");
  const optionIndicator = pageWrapper.querySelector("#options-indicator");
  const optionCount = pageWrapper.querySelector("#options-count");
  const optionItems = pageWrapper.querySelector("#options-items");
  const optionsComponent = document.querySelector("#options-component");

  const summaryForm = pageWrapper.querySelector("#summary-form");

  const hiddenUIElements = document.querySelectorAll(
    "#features-toggle, #actions-component, #options-component",
  );

  const isDesktop = window.matchMedia("(min-width: 992px)").matches;
  const allMobileQuery = window.matchMedia("(max-width: 767px)");

  function globalFuncs() {
    getBoatOptionsCodes();
    init3dActionIds();
    handleNavBtnClicks();
    handleOptions();
    handlePopups();
    colorFilter();
    optionFilter();
  }

  function addHiddenInput(form, name, value = "") {
    if (!form || !name) return;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;

    form.prepend(input);
  }

  function updateOptionsStyles(target) {
    const allMobileQuery = window.matchMedia("(max-width: 767px)");
    const isLandscapeSmall = window.matchMedia(
      "(orientation: landscape) and (max-height: 600px)",
    );

    if (optionsComponent && target) {
      if (allMobileQuery.matches) {
        gsap.to(optionsComponent, {
          "--_options---padding--top": `${target.offsetHeight}px`,
        });
      } else {
        gsap.to(optionsComponent, {
          "--_options---padding--top": "0px",
        });
      }
    }

    if (modelIframe && target) {
      if (isLandscapeSmall.matches) {
        gsap.to(modelIframe, {
          "--menu-max-width": "40%",
        });
      } else {
        gsap.to(modelIframe, {
          "--menu-max-width": "0%",
        });
      }
    }
  }

  function updateCurrentOptionsStyles() {
    const current = document.querySelector("[data-options-item].is-active");
    if (current) updateOptionsStyles(current);
  }

  function applyBoatCodes(options) {
    if (!options) return;

    const optionButtons = document.querySelectorAll(
      "[data-option-btn][data-is-option]",
    );

    optionButtons.forEach((el) => {
      let id = el.id || "";

      if (id.startsWith("d_") || id.startsWith("e_")) {
        id = id.slice(2);
      }

      const optionKey = (el.innerText || el.textContent || "").trim();

      const match = options[id];
      if (!match) return;

      if (match.code) {
        el.dataset.code = match.code;
        el.dataset.value = `${optionKey} (${match.code})`;
      }

      if (match.code_second) {
        el.dataset.codeSecond = match.code_second;
        el.dataset.valueSecond = `${optionKey} (${match.code_second})`;
      }
    });
  }

  async function captureScreenshot({
    iframeEl,
    quality = 0.85,
    background = "#fff",
    maxWidth = 960,
  } = {}) {
    const doc = iframeEl?.contentDocument;
    const glCanvas = doc?.querySelector("canvas");
    if (!glCanvas) throw new Error("Canvas not found inside iframe");

    const img = new Image();
    img.src = glCanvas.toDataURL("image/png");
    await img.decode();

    const targetW = Math.min(img.width, maxWidth);
    const targetH = Math.round(img.height * (targetW / img.width));

    const out = document.createElement("canvas");
    out.width = targetW;
    out.height = targetH;

    const ctx = out.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.drawImage(img, 0, 0, targetW, targetH);

    return out.toDataURL("image/jpeg", quality);
  }
  // End of Global Elements/Functions

  // Get Boat Data
  async function fetchData() {
    const cacheKey = "dataCache";

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);

        if (cachedData?.id === boatId) {
          return cachedData;
        } else {
          sessionStorage.removeItem(cacheKey);
          sessionStorage.removeItem("initialColorsAndOptions");
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem("initialColorsAndOptions");
      }
    }

    const response = await fetch(`${apiOrigin}/cms/boats/${boatId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Boat Fetch error: status " + response.status);
    }

    const data = await response.json();

    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }

  async function fetchDataSequentially() {
    let data = null;

    try {
      data = await fetchData();
    } catch (error) {
      console.error("Boat Fetch error:", error);
    }

    if (!data) {
      console.warn("No boat data to process");
      return;
    }

    const boatData = data;

    document.body.dataset.boatId = data.slug;

    // Initial options
    const boatInitialColorsAndOptions = boatData["initial-colors-and-options"];

    if (boatInitialColorsAndOptions) {
      let idsArray = [];

      boatInitialColorsAndOptions.forEach((item) => {
        if (Array.isArray(item["initial-colors"])) {
          item["initial-colors"].forEach((color) => {
            if (color["color-id"]) {
              idsArray.push(color["color-id"]);
            }
          });
        }

        if (Array.isArray(item["initial-options"])) {
          item["initial-options"].forEach((option) => {
            if (option["button-id"]) {
              idsArray.push(option["button-id"]);
            }
          });
        }
      });

      sessionStorage.setItem(
        "initialColorsAndOptions",
        JSON.stringify(idsArray),
      );
    }

    // Add Nav Links
    const navLinks = [
      ["all-models-text", "all-models-link"],
      ["dealers-text", "dealers-link"],
      ["model-details-text", "model-details-link"],
    ];

    const fragment = document.createDocumentFragment();

    navLinks.forEach(([textKey, linkKey]) => {
      const text = boatData[textKey];
      const link = boatData[linkKey];
      if (text && link) {
        const a = document.createElement("a");
        a.href = link;
        a.className = "header_nav_link";
        a.textContent = text;
        fragment.appendChild(a);

        if (summaryForm && textKey === "model-details-text") {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "model";
          input.value = text;

          summaryForm.prepend(input);
        }
      }
    });

    headerNav.insertBefore(fragment, headerNav.firstChild);

    // Add Technical Data
    const technicalData = boatData["technical-data-2"];

    if (technicalData && pageWrapper) {
      const popup = document.createElement("div");
      popup.dataset.popup = "technical-data";
      popup.className = "popup_component";
      popup.innerHTML = `
          <div data-popup-overlay="technical-data" class="popup_overlay"></div>
          <div data-popup-content="technical-data" class="popup_content">
            <button type="button" data-popup-close="technical-data" class="popup_close">
              <div class="popup_close_line"></div>
              <div class="popup_close_line is-2"></div>
            </button>
            <div class="popup_slot">
              <div class="technical-data_component">
                <h2 class="technical-data_title">Technical data</h2>
                <div class="technical-data_text w-richtext">
                  ${technicalData}
                </div>
              </div>
            </div>
          </div>
        `;

      pageWrapper.appendChild(popup);

      if (summaryForm) {
        const doc = new DOMParser().parseFromString(technicalData, "text/html");
        const ps = doc.querySelectorAll("p");

        const items = [];
        for (let i = 0; i + 1 < ps.length; i += 2) {
          const label = (ps[i].textContent || "").trim();
          const value = (ps[i + 1].textContent || "").trim();
          if (label && value) items.push({ label, value });
        }

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "characteristics";
        input.value = JSON.stringify(items);

        summaryForm.prepend(input);
      }
    }

    // Add Color
    const optionItemsData = [
      [
        "color-option-title",
        "color-option-1-subtitle-1",
        "color-option-1-colors-1",
        "color-option-1-subtitle-2",
        "color-option-1-colors-2",
      ],
      [
        "color-option-2-title",
        "color-option-2-subtitle-1",
        "color-option-2-colors-1",
        "color-option-2-subtitle-2",
        "color-option-2-colors-2",
      ],
      [
        "color-option-3-title",
        "color-option-3-subtitle-1",
        "color-option-3-colors-1",
        "color-option-3-subtitle-2",
        "color-option-3-colors-2",
      ],
      [
        "color-option-4-title",
        "color-option-4-subtitle-1",
        "color-option-4-colors-1",
        "color-option-4-subtitle-2",
        "color-option-4-colors-2",
      ],
    ];

    const colorOptionsFragment = document.createDocumentFragment();
    const colorNavFragment = document.createDocumentFragment();

    function renderColorControls(
      colorsArray,
      groupName,
      groupIndex,
      subgroupIndex,
    ) {
      const valueFieldName = `tab-${groupIndex}-color-${subgroupIndex}`;
      addHiddenInput(summaryForm, valueFieldName);

      const controls = document.createElement("div");
      controls.className = "options_controls is-grid";
      controls.dataset.optionControls = "";

      colorsArray.forEach((color) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "options_color-btn";
        button.dataset.optionBtn = "";
        button.dataset.isColor = "";
        button.dataset["3dAction"] = "";
        button.dataset.fieldName = valueFieldName;
        button.dataset.value = `${groupName}: ${color["color-name"]}`;
        button.id = `${color["color-id"]}`;

        const deactivateColors = color["deactivate-colors"];
        if (Array.isArray(deactivateColors) && deactivateColors.length > 0) {
          deactivateColors.forEach((color) => {
            const ids = deactivateColors
              .map((c) => c["color-id"])
              .filter(Boolean);
            button.dataset.deactivateColors = ids.join(", ");
          });
        }

        const relatedOptions = color["related-options"];
        if (Array.isArray(relatedOptions) && relatedOptions.length > 0) {
          relatedOptions.forEach((color) => {
            const ids = relatedOptions
              .map((c) => c["button-id"])
              .filter(Boolean);
            button.dataset.relatedOptions = ids.join(", ");
          });
        }

        const colorWrap = document.createElement("span");
        colorWrap.className = "options_color-btn_colors";

        if (color["color-image"] && color["color-image"].url) {
          const img = document.createElement("img");
          img.src = color["color-image"].url;
          img.loading = "lazy";
          img.alt = `${color["color-name"] || "Color"} image`;
          img.className = "options_color-btn_image";
          colorWrap.appendChild(img);
        } else {
          if (color["color-1"]) {
            const color1 = document.createElement("span");
            if (color["colors-divider"]) {
              color1.className = "options_color-btn_color-1 with-divider";
            } else {
              color1.className = "options_color-btn_color-1";
            }
            color1.style.backgroundColor = color["color-1"];
            colorWrap.appendChild(color1);
          }

          if (color["color-2"]) {
            const color2 = document.createElement("span");
            if (color["colors-divider"]) {
              color2.className = "options_color-btn_color-2 with-divider";
            } else {
              color2.className = "options_color-btn_color-2";
            }
            color2.style.backgroundColor = color["color-2"];
            colorWrap.appendChild(color2);
          }

          if (color["text-on-color"]) {
            const colorText = document.createElement("span");
            colorText.className = "options_color-btn_color-text";
            colorText.textContent = color["text-on-color"];

            if (color["text-color"]) {
              colorText.style.color = color["text-color"];
            }

            colorWrap.appendChild(colorText);
          }
        }

        const name = document.createElement("span");
        name.className = "options_color-btn_text";
        name.textContent = color["color-name"] || color["color-id"] || "";

        button.appendChild(colorWrap);
        button.appendChild(name);
        controls.appendChild(button);
      });

      const total = colorsArray.length;
      const divisor = window.innerWidth < 390 ? 5 : 6;
      const remainder = total % divisor;
      if (remainder !== 0) {
        const fillersNeeded = divisor - remainder;
        for (let i = 0; i < fillersNeeded; i++) {
          const filler = document.createElement("div");
          filler.className = "options_color-btn is-empty";
          controls.appendChild(filler);
        }
      }

      return controls;
    }

    optionItemsData.forEach(
      (
        [titleKey, subTitleOneKey, colorsOneKey, subTitleTwoKey, colorsTwoKey],
        index,
      ) => {
        const title = boatData[titleKey];
        const subTitleOne = boatData[subTitleOneKey];
        const colorsOne = boatData[colorsOneKey];
        const subTitleTwo = boatData[subTitleTwoKey];
        const colorsTwo = boatData[colorsTwoKey];

        // Точна перевірка наявності контенту для групи
        const hasContent =
          title ||
          (subTitleOne && subTitleOne.trim()) ||
          (Array.isArray(colorsOne) && colorsOne.length > 0) ||
          (subTitleTwo && subTitleTwo.trim()) ||
          (Array.isArray(colorsTwo) && colorsTwo.length > 0);

        if (hasContent) {
          const item = document.createElement("div");
          item.dataset.optionsItem = "";
          item.className = "options_item";

          if (index === 0) {
            item.classList.add("is-active");
          }

          let wrapper;

          if (title) {
            const h2 = document.createElement("h2");
            h2.className = "options_title is-main";
            h2.innerHTML = title;
            item.appendChild(h2);

            const button = document.createElement("button");
            button.type = "button";
            button.dataset.navBtn = "";
            button.className = "nav_btn";

            if (index === 0) {
              button.classList.add("is-active");
            }

            button.innerHTML = `
                            <span class="nav_btn_caption-visible">${title}</span>
                            <span class="nav_btn_caption-base">${title}</span>
                            <span class="nav_btn_line"></span>
                        `;

            colorNavFragment.appendChild(button);

            wrapper = document.createElement("div");
            wrapper.className = "options_controls_wrapper";
            item.appendChild(wrapper);
          }

          if (subTitleOne) {
            const h3 = document.createElement("h3");
            h3.className = "options_title";
            h3.textContent = subTitleOne;
            wrapper.appendChild(h3);
          }

          if (Array.isArray(colorsOne) && colorsOne.length > 0) {
            const groupNameOne = subTitleOne
              ? title + " | " + subTitleOne
              : title;
            const controls = renderColorControls(
              colorsOne,
              groupNameOne,
              index + 1,
              1,
            );
            wrapper.appendChild(controls);
          }

          if (subTitleTwo) {
            const h3 = document.createElement("h3");
            h3.className = "options_title";
            h3.textContent = subTitleTwo;
            wrapper.appendChild(h3);
          }

          if (Array.isArray(colorsTwo) && colorsTwo.length > 0) {
            const groupNameTwo = subTitleTwo ? title + " | " + subTitleTwo : "";
            const controls = renderColorControls(
              colorsTwo,
              groupNameTwo,
              index + 1,
              2,
            );
            wrapper.appendChild(controls);
          }

          colorOptionsFragment.appendChild(item);
        }
      },
    );

    navComponent.insertBefore(colorNavFragment, navComponent.firstChild);
    optionItems.insertBefore(colorOptionsFragment, optionItems.firstChild);

    // Add Options
    const options = boatData.options || [];
    const optionsFragment = document.createDocumentFragment();
    const optionsNavFragment = document.createDocumentFragment();

    const defaultGroupSize = 9;
    const countTab1 = boatData["options-count-tab-1"] || defaultGroupSize;
    const countTab2 = boatData["options-count-tab-2"] || defaultGroupSize;
    const countTab3 = boatData["options-count-tab-3"] || defaultGroupSize;

    let currentControls;
    let item;
    let groupCount = 0;
    let processedCount = 0;

    options.forEach((option, index) => {
      const {
        title,
        "button-id": buttonId,
        "image-2d": image2d,
        "has-3d": has3d,
        "filter-colors": filterColors,
        "mutual-exclusion-option": mutualOption,
        "activator-option": activatorOption,
        "second-code-activator": secondCodeActivator,
        related: relatedOpts,
      } = option;

      const codeFieldName = `option-${index + 1}`;
      addHiddenInput(summaryForm, codeFieldName);

      const groupSize =
        groupCount === 0
          ? countTab1
          : groupCount === 1
            ? countTab2
            : groupCount === 2
              ? countTab3
              : defaultGroupSize;

      if (processedCount === 0) {
        item = document.createElement("div");
        item.dataset.optionsItem = "";
        item.classList.add("options_item");

        const h2 = document.createElement("h2");
        h2.classList.add("options_title", "is-main");
        h2.textContent = `Equipment - ${groupCount + 1}`;
        item.appendChild(h2);

        currentControls = document.createElement("div");
        currentControls.className = "options_controls is-options";
        currentControls.dataset.optionControls = "";
        currentControls.dataset.multiple = "";
        item.appendChild(currentControls);

        optionsFragment.appendChild(item);

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.navBtn = "";
        button.className = "nav_btn";
        button.innerHTML = `
            <span class="nav_btn_caption-visible">Equipment - ${groupCount + 1}</span>
            <span class="nav_btn_caption-base">Equipment - ${groupCount + 1}</span>
            <span class="nav_btn_line"></span>
          `;
        optionsNavFragment.appendChild(button);
      }

      const mainBtn = document.createElement("button");
      mainBtn.type = "button";
      mainBtn.id = buttonId;
      mainBtn.classList.add("options_btn");
      mainBtn.dataset.optionBtn = "";
      mainBtn.dataset.isOption = "";
      mainBtn.dataset["3dAction"] = "";

      mainBtn.dataset.codeFieldName = codeFieldName;
      mainBtn.textContent = title;

      if (Array.isArray(filterColors) && filterColors.length > 0) {
        filterColors.forEach((color) => {
          const ids = filterColors.map((c) => c["color-id"]).filter(Boolean);
          mainBtn.dataset.setColor = ids.join(", ");
        });
      }

      if (Array.isArray(mutualOption) && mutualOption.length > 0) {
        mutualOption.forEach((option) => {
          const ids = mutualOption.map((o) => o["button-id"]).filter(Boolean);
          mainBtn.dataset.mutualOption = ids.join(", ");
        });
      }

      if (Array.isArray(activatorOption) && activatorOption.length > 0) {
        activatorOption.forEach((option) => {
          const ids = activatorOption
            .map((o) => o["button-id"])
            .filter(Boolean);
          mainBtn.dataset.activatorOption = ids.join(", ");
        });
        mainBtn.classList.add("is-disabled");
      }

      if (
        Array.isArray(secondCodeActivator) &&
        secondCodeActivator.length > 0
      ) {
        secondCodeActivator.forEach((option) => {
          const ids = secondCodeActivator
            .map((o) => o["button-id"])
            .filter(Boolean);
          mainBtn.dataset.secondCodeActivator = ids.join(", ");
        });
      }

      if (Array.isArray(relatedOpts) && relatedOpts.length > 0) {
        relatedOpts.forEach((option) => {
          const ids = relatedOpts.map((o) => o["button-id"]).filter(Boolean);
          mainBtn.dataset.related = ids.join(", ");
        });
      }

      const has2d = !!image2d;

      const controlsGroup = document.createElement("div");
      controlsGroup.classList.add("options_controls_group");

      controlsGroup.appendChild(mainBtn);

      const extraBtn = document.createElement("button");
      extraBtn.type = "button";
      extraBtn.classList.add("options_btn", "is-info");
      extraBtn.textContent = "i";

      if (has2d) {
        extraBtn.dataset.popupOpen = `parts-${index + 1}`;

        const popup = document.createElement("div");
        popup.dataset.popup = `parts-${index + 1}`;
        popup.className = "popup_component";

        popup.innerHTML = `
            <div data-popup-overlay="parts-${index + 1}" class="popup_overlay"></div>
            <div data-popup-content="parts-${index + 1}" class="popup_content">
              <button type="button" data-popup-close="parts-${index + 1}" class="popup_close">
                <div class="popup_close_line"></div>
                <div class="popup_close_line is-2"></div>
              </button>
              <div class="popup_slot">
                <img src="${image2d.url}" loading="lazy" alt="${title}" class="popup_image">
              </div>
            </div>
          `;

        pageWrapper.appendChild(popup);
        controlsGroup.appendChild(extraBtn);
      } else if (has3d) {
        extraBtn.id = `d_${buttonId}_info`;
        controlsGroup.appendChild(extraBtn);
      }

      currentControls.appendChild(controlsGroup);

      processedCount++;

      if (processedCount === groupSize) {
        processedCount = 0;
        groupCount++;
      }
    });

    navComponent.insertBefore(
      optionsNavFragment,
      navComponent.lastElementChild,
    );
    optionItems.insertBefore(optionsFragment, optionItems.lastElementChild);

    // Run Global Functions
    globalFuncs();
    check3DModelLoading();
  }

  if (!document.body.hasAttribute("data-no-fetch")) {
    fetchDataSequentially();
  }
  // End of Get Boat Data

  //3D Model Loading Check
  function finalizeUISetup() {
    hiddenUIElements.forEach((el) => el?.classList.remove("is-hidden"));
    updateCurrentOptionsStyles();
  }

  function check3DModelLoading() {
    const iframe = document.querySelector(".model_component");
    if (!iframe) {
      console.warn("iframe not found");
      return;
    }

    let handled = false;

    function handleMessage(event) {
      if (event.data?.type !== "VERGE3D_LOADED") return;
      if (handled) return;

      handled = true;
      console.log("3D has loaded");

      window.removeEventListener("message", handleMessage);
      clearTimeout(timeoutid);

      console.log("Applying initial state");
      applyInitialState();

      finalizeUISetup();
    }

    window.addEventListener("message", handleMessage);

    const timeoutid = setTimeout(() => {
      if (handled) return;
      console.warn("Timeout waiting for VERGE3D_LOADED");
      window.removeEventListener("message", handleMessage);
    }, 60000);
  }

  // End of 3D Model Loading Check

  // Boat Options Codes
  function getBoatOptionsCodes() {
    const storageKey = "boatOptionsCodes";
    const boatIdRaw = document.body.dataset.boatId;

    if (!boatIdRaw) {
      console.warn("data-boat-id not found on body");
      return Promise.resolve(null);
    }

    const boatId = boatIdRaw.trim().toLowerCase();
    const cachedData = sessionStorage.getItem(storageKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      applyBoatCodes(parsed[boatId] || null);
      return Promise.resolve(parsed[boatId] || null);
    }

    return fetch(`${frontOrigin}/boat-options-codes.json`)
      .then((res) => res.json())
      .then((data) => {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
        applyBoatCodes(data[boatId] || null);
        return data[boatId] || null;
      })
      .catch((err) => {
        console.error("Error loading boat options:", err);
        return null;
      });
  }
  // End of Boat Options Codes

  // 3D Action Ids
  function init3dActionIds() {
    document.querySelectorAll("[data-3d-action]").forEach((el) => {
      const currentId = el.id;

      if (
        currentId &&
        !currentId.startsWith("d_") &&
        !currentId.startsWith("e_") &&
        currentId !== "tube_color_off_white_hypalon" &&
        currentId !== "bowrailing"
      ) {
        el.id = "d_" + currentId;
      }

      el.addEventListener("click", () => {
        const id = el.id;

        if (id.startsWith("d_")) {
          el.id = id.replace(/^d_/, "e_");
        } else if (id.startsWith("e_")) {
          el.id = id.replace(/^e_/, "d_");
        }

        if (el.dataset.toggleActiveClass !== undefined) {
          el.classList.toggle("is-active");
        }
      });
    });
  }

  // End of 3D Action Ids

  // Filter
  function colorFilter() {
    const colorButtons = [
      ...document.querySelectorAll("[data-option-btn][data-is-color]"),
    ];

    const deactivateColorsButtons = colorButtons.filter(
      (btn) => btn.dataset.deactivateColors,
    );
    let neighborsWithoutDeactivateButtons = new Set();
    let buttonsToDeactivate = new Set();
    const buttonsWithRelatedOptions = colorButtons.filter(
      (btn) => btn.dataset.relatedOptions,
    );

    deactivateColorsButtons.forEach((deactivateBtn) => {
      const siblings = Array.from(deactivateBtn.parentElement.children).filter(
        (sibling) =>
          sibling !== deactivateBtn && !sibling.dataset.deactivateColors,
      );

      siblings.forEach((sibling) =>
        neighborsWithoutDeactivateButtons.add(sibling),
      );

      const buttonsToDeactivateIds = deactivateBtn.dataset.deactivateColors
        .split(",")
        .map((x) => x.trim());

      const currentButtonsToDeactivate = colorButtons.filter(
        (toDeactivateBtn) =>
          buttonsToDeactivateIds.some((id) => toDeactivateBtn.id.includes(id)),
      );

      currentButtonsToDeactivate.forEach((btn) => {
        buttonsToDeactivate.add(btn);

        const group = btn.closest("[data-option-controls]");
        if (group) {
          const siblings = [
            ...group.querySelectorAll("[data-option-btn][data-field-name]"),
          ].filter((sibling) => sibling !== btn);

          siblings.forEach((sibling) => buttonsToDeactivate.add(sibling));
        }
      });

      deactivateBtn.addEventListener("click", () => {
        currentButtonsToDeactivate.forEach((targetBtn) => {
          const wasActive = targetBtn.classList.contains("is-active");
          targetBtn.classList.add("is-disabled");

          if (targetBtn.id.startsWith("e_")) {
            targetBtn.id = targetBtn.id.replace(/^e_/, "d_");
          }

          if (wasActive) {
            targetBtn.classList.remove("is-active");

            const group = targetBtn.closest("[data-option-controls]");
            if (group) {
              const siblings = [
                ...group.querySelectorAll("[data-option-btn][data-field-name]"),
              ];
              const available = siblings.find(
                (btn) =>
                  !btn.classList.contains("is-disabled") && btn !== targetBtn,
              );
              if (available) {
                available.click();
              }
            }
          }
        });

        const allButtons = new Set();
        currentButtonsToDeactivate.forEach((btn) => {
          const group = btn.closest("[data-option-controls]");
          if (group) {
            const b = group.querySelectorAll(
              "[data-option-btn][data-field-name]",
            );
            b.forEach((el) => allButtons.add(el));
          }
        });

        allButtons.forEach((btn) => {
          if (!currentButtonsToDeactivate.includes(btn)) {
            btn.classList.remove("is-disabled");
          }
        });
      });
    });

    neighborsWithoutDeactivateButtons.forEach((neighborBtn) => {
      neighborBtn.addEventListener("click", () => {
        buttonsToDeactivate.forEach((toDeactivateBtn) => {
          toDeactivateBtn.classList.remove("is-disabled");
        });
      });
    });

    buttonsWithRelatedOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        const values = btn.dataset.relatedOptions.split(", ");

        document
          .querySelectorAll("[data-option-btn][data-code]")
          .forEach((targetBtn) => {
            if (targetBtn.id.startsWith("d_")) {
              const idCore = targetBtn.id.slice(2); // remove "d_" prefix
              if (values.includes(idCore)) {
                targetBtn.click();
              }
            }
          });
      });
    });

    const relatedOptionsButtons = colorButtons.filter(
      (btn) => btn.dataset.relatedOptions,
    );
    let relatedToColorOptionsMap = new Map();

    relatedOptionsButtons.forEach((colorBtn) => {
      if (colorBtn.id && colorBtn.dataset.relatedOptions) {
        const key = colorBtn.dataset.relatedOptions;
        const value = colorBtn.id.slice(2);

        if (!relatedToColorOptionsMap.has(key)) {
          relatedToColorOptionsMap.set(key, []);
        }

        relatedToColorOptionsMap.get(key).push(value);
      }
    });

    relatedToColorOptionsMap.forEach((value, key) => {
      const allOptions = document.querySelectorAll(
        "[data-option-btn][data-is-option]",
      );

      allOptions.forEach((option) => {
        if (option.id && option.id.includes(key)) {
          option.dataset.relatedToColorParent = value.join(", ");
        }
      });
    });

    const relatedToColorOptionParents = document.querySelectorAll(
      "[data-option-btn][data-related-to-color-parent]",
    );

    relatedToColorOptionParents.forEach((parent) => {
      parent.addEventListener("click", () => {
        const parentId = parent.id;
        const parentKey = parentId.slice(2);
        const relatedColorsIds = parent.dataset.relatedToColorParent;
        const firstRelatedColorId = relatedColorsIds.split(",")[0].trim();
        const buttonToClick = document.querySelector(
          `[data-option-btn][data-related-options][id*="${firstRelatedColorId}"]`,
        );
        const matchingRelatedColorOptions = Array.from(
          document.querySelectorAll("[data-option-btn][data-related-options]"),
        ).filter((el) => el.dataset.relatedOptions === parentKey);

        if (parentId.startsWith("d_")) {
          matchingRelatedColorOptions.forEach((colorOption) => {
            if (colorOption.classList.contains("is-active")) {
              const currentId = colorOption.id;
              const currentUrlParam = colorOption.dataset.fieldName;
              const url = new URL(window.location.href);
              const params = url.searchParams;
              const fieldInForm = summaryForm.querySelector(
                `[name="${currentUrlParam}"]`,
              );

              fieldInForm.value = "";

              colorOption.id = colorOption.id = "d_" + currentId.slice(2);
              colorOption.classList.remove("is-active");

              if (params.has(currentUrlParam)) {
                params.delete(currentUrlParam);
                url.search = params.toString();
                window.history.replaceState({}, "", url.toString());
              }
            }
          });
        } else if (parentId.startsWith("e_")) {
          const allIdsStartWithD = matchingRelatedColorOptions.every((el) =>
            el.id.startsWith("d_"),
          );
          if (buttonToClick && allIdsStartWithD) {
            buttonToClick.click();
          }
        }
      });
    });
  }

  function optionFilter() {
    const buttons = document.querySelectorAll("[data-option-btn]");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const currentId = btn.id;
        const currentCleanId = currentId.replace(/^(e_|d_)/, "");

        const activatorButtons = document.querySelectorAll(
          `[data-activator-option*="${currentCleanId}"]`,
        );

        if (currentId.startsWith("e_")) {
          activatorButtons.forEach((activatorBtn) => {
            activatorBtn.classList.remove("is-disabled");
          });
        } else if (currentId.startsWith("d_")) {
          activatorButtons.forEach((activatorBtn) => {
            if (activatorBtn.id.includes("e_")) {
              activatorBtn.click();
              activatorBtn.classList.add("is-disabled");
            } else {
              activatorBtn.classList.add("is-disabled");
            }
          });
        }

        if (btn.hasAttribute("data-mutual-option")) {
          const mutualIds = btn.dataset.mutualOption.split(", ");
          const mutualButtons = Array.from(
            document.querySelectorAll("[data-option-btn]"),
          ).filter((b) => {
            const cleanId = b.id.slice(2);
            return mutualIds.includes(cleanId);
          });

          if (currentId.startsWith("e_")) {
            mutualButtons.forEach((mutualBtn) => {
              if (mutualBtn.id.startsWith("e_")) {
                mutualBtn.click();
                mutualBtn.classList.add("is-inactive");
              } else {
                mutualBtn.classList.add("is-inactive");
              }
            });
          }

          if (currentId.startsWith("d_")) {
            mutualButtons.forEach((mutualBtn) => {
              mutualBtn.classList.remove("is-inactive");
            });
          }
        }

        if (btn.hasAttribute("data-related")) {
          if (currentId.startsWith("e_")) {
            const values = btn.dataset.related.split(", ");

            document
              .querySelectorAll("[data-option-btn][data-code]")
              .forEach((targetBtn) => {
                if (targetBtn.id.startsWith("d_")) {
                  const idCore = targetBtn.id.slice(2); // remove "d_" prefix
                  if (values.includes(idCore)) {
                    targetBtn.click();
                  }
                }
              });
          }
        }

        if (btn.hasAttribute("data-set-color")) {
          const colors = btn.dataset.setColor.split(" ");

          colors.forEach((color) => {
            const targets = document.querySelectorAll(
              `[data-option-btn][data-field-name][id*="${color}"]`,
            );

            targets.forEach((targetBtn) => {
              const siblingBtns = targetBtn
                .closest("[data-option-controls]")
                ?.querySelectorAll("[data-option-btn]");

              if (btn.classList.contains("is-active")) {
                siblingBtns?.forEach((sibling) => {
                  sibling.classList.remove("is-disabled");
                });
              } else {
                targetBtn.click();

                siblingBtns?.forEach((sibling) => {
                  if (sibling !== targetBtn) {
                    sibling.classList.add("is-disabled");
                    if (sibling.id.startsWith("e_")) {
                      sibling.id = sibling.id.replace(/^e_/, "d_");
                    }
                  }
                });
              }
            });
          });
        }
      });
    });
  }
  // End of Filter

  // Nav Block
  function handleNavBtnClicks() {
    if (navComponent) {
      const allBtns = [...navComponent.querySelectorAll("[data-nav-btn]")];
      const optionItems = [...document.querySelectorAll("[data-options-item]")];

      navComponent.addEventListener("click", (event) => {
        const button = event.target.closest("[data-nav-btn]");
        if (
          !button ||
          !navComponent.contains(button) ||
          button.classList.contains("is-active")
        )
          return;

        const activeBtn = navComponent.querySelector(
          "[data-nav-btn].is-active",
        );
        if (activeBtn) {
          const activeIndex = allBtns.indexOf(activeBtn);
          if (activeIndex !== -1 && optionItems[activeIndex]) {
            optionItems[activeIndex].classList.remove("is-active");
          }
          activeBtn.classList.remove("is-active");
        }

        button.classList.add("is-active");

        const clickedIndex = allBtns.indexOf(button);
        if (clickedIndex !== -1 && optionItems[clickedIndex]) {
          optionItems[clickedIndex].classList.add("is-active");
        }

        prevOptionBtn.classList.toggle("is-hidden", clickedIndex === 0);
        nextOptionBtn.classList.toggle(
          "is-hidden",
          clickedIndex === allBtns.length - 1,
        );

        if (optionIndicator) {
          optionIndicator.textContent = clickedIndex + 1;
        }
      });
    }
  }

  // End of Nav Block

  // Toggle Hide Menu
  const toggleHideMenu = document.getElementById("toggle-hide-menu");

  if (toggleHideMenu) {
    const optionsMain = document.getElementById("options-main");
    const optionsProgress = document.getElementById("options-progress");

    toggleHideMenu.addEventListener("click", () => {
      toggleHideMenu.classList.toggle("is-active");
      optionsMain.classList.toggle("is-hidden");
      optionsProgress.classList.toggle("is-hidden");

      if (isDesktop) {
        navComponent.classList.toggle("is-hidden");
      }

      if (toggleHideMenu.classList.contains("is-active")) {
        gsap.to(optionsComponent, {
          "--_options---padding--top": "0px",
        });
        gsap.to(modelIframe, {
          "--menu-max-width": "0%",
        });
      } else {
        updateCurrentOptionsStyles();
      }
    });
  }
  // End of Toggle Hide Menu

  // Mobile Menu
  if (headerNav) {
    const headerNavDuration = 0.3;

    document.querySelectorAll("[data-header-nav-open]").forEach((el) => {
      el.addEventListener("click", () => {
        headerNav.style.display = "flex";
        gsap.to(headerNav, {
          opacity: 1,
          duration: headerNavDuration,
        });
      });
    });

    document.querySelectorAll("[data-header-nav-close]").forEach((el) => {
      el.addEventListener("click", () => {
        gsap.to(headerNav, {
          opacity: 0,
          duration: headerNavDuration,
          onComplete: () => {
            headerNav.style.display = "none";
          },
        });
      });
    });
  }
  // End of Mobile Menu

  // Popups
  function handlePopups() {
    document.querySelectorAll("[data-popup-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const popupName = button.dataset.popupOpen;
        const popup = document.querySelector(`[data-popup="${popupName}"]`);
        const content = popup.querySelector("[data-popup-content]");
        const overlay = popup.querySelector("[data-popup-overlay]");
        const close = popup.querySelector("[data-popup-close]");

        popup.style.display = "flex";

        gsap
          .timeline({
            defaults: {
              duration: popupDuration,
            },
          })
          .to(popup, {
            opacity: 1,
          })
          .to(
            overlay,
            {
              opacity: 0.35,
            },
            "<",
          )
          .to(
            content,
            {
              y: "0rem",
              opacity: 1,
            },
            "<25%",
          )
          .set(
            "body",
            {
              overflow: "hidden",
            },
            "<75%",
          )
          .to(
            close,
            {
              opacity: 1,
            },
            "<",
          );
      });
    });

    document
      .querySelectorAll("[data-popup-close], [data-popup-overlay]")
      .forEach((el) => {
        el.addEventListener("click", () => {
          const popupName = el.dataset.popupClose || el.dataset.popupOverlay;
          const popup = document.querySelector(`[data-popup="${popupName}"]`);
          const content = popup.querySelector("[data-popup-content]");
          const overlay = popup.querySelector("[data-popup-overlay]");
          const close = popup.querySelector("[data-popup-close]");

          gsap
            .timeline({
              defaults: {
                duration: popupDuration,
              },
              onComplete: () => {
                popup.style.display = "none";
              },
            })
            .to(close, {
              opacity: 0,
            })
            .to(
              content,
              {
                y: "4rem",
                opacity: 0,
              },
              "<75%",
            )
            .set(
              "body",
              {
                clearProps: "all",
              },
              "<25%",
            )
            .to(
              [popup, overlay],
              {
                opacity: 0,
              },
              "<",
            );
        });
      });
  }

  // End of Popups

  // Options
  allMobileQuery.addEventListener("change", () => {
    updateCurrentOptionsStyles();
  });

  function handleOptions() {
    const navButtons = [...document.querySelectorAll("[data-nav-btn]")];
    const optionItems = [...document.querySelectorAll("[data-options-item]")];
    const firstOptionItem = optionItems[0];
    const optionsCount = optionItems.length;
    const lastOptionItem = optionItems[optionsCount - 1];

    if (optionCount) {
      optionCount.textContent = optionsCount;
    }

    function updateActiveItem(direction) {
      const current = document.querySelector("[data-options-item].is-active");
      if (!current) return;

      const target =
        direction === "next"
          ? current.nextElementSibling
          : current.previousElementSibling;

      const buttonToHide = direction === "next" ? nextOptionBtn : prevOptionBtn;
      const buttonToShow = direction === "next" ? prevOptionBtn : nextOptionBtn;

      if (buttonToShow?.getAttribute("data-hidden") === "true") {
        buttonToShow.dataset.hidden = "false";
      }

      if (target && target.matches("[data-options-item]")) {
        current.classList.remove("is-active");
        target.classList.add("is-active");
      } else {
        return;
      }

      const newCurrent = document.querySelector(
        "[data-options-item].is-active",
      );

      prevOptionBtn.classList.toggle(
        "is-hidden",
        newCurrent === firstOptionItem,
      );
      nextOptionBtn.classList.toggle(
        "is-hidden",
        newCurrent === lastOptionItem,
      );

      const newIndex = optionItems.indexOf(newCurrent);
      if (newIndex === -1) return;

      const currentActiveNav = document.querySelector(
        "[data-nav-btn].is-active",
      );
      if (currentActiveNav) {
        currentActiveNav.classList.remove("is-active");
      }

      if (navButtons[newIndex]) {
        navButtons[newIndex].click();
      }

      if (optionIndicator) {
        optionIndicator.textContent = newIndex + 1;
      }

      updateOptionsStyles(target);
    }

    prevOptionBtn?.addEventListener("click", () => updateActiveItem("prev"));
    nextOptionBtn?.addEventListener("click", () => updateActiveItem("next"));

    const optionControls = document.querySelectorAll("[data-option-controls]");
    let secondCodeActivatorsMap = new Map();
    let relatedOptionsMap = new Map();

    optionControls.forEach((controlGroup) => {
      const curOptionWithActivators = controlGroup.querySelectorAll(
        "[data-option-btn][data-second-code-activator]",
      );

      curOptionWithActivators.forEach((option) => {
        if (option.id && option.dataset.secondCodeActivator) {
          const key = option.dataset.secondCodeActivator;
          const value = option.id.slice(2);

          secondCodeActivatorsMap.set(key, value);
        }
      });

      const relatedOptions = controlGroup.querySelectorAll(
        "[data-option-btn][data-related]",
      );

      relatedOptions.forEach((option) => {
        if (option.id && option.dataset.related) {
          const key = option.dataset.related;
          const value = option.id.slice(2);

          if (!relatedOptionsMap.has(key)) {
            relatedOptionsMap.set(key, []);
          }

          relatedOptionsMap.get(key).push(value);
        }
      });

      const isMultiple = controlGroup.hasAttribute("data-multiple");

      controlGroup.addEventListener("click", (event) => {
        const clickedButton = event.target.closest("[data-option-btn]");
        if (!clickedButton) return;

        const url = new URL(window.location);
        const params = url.searchParams;

        if (isMultiple) {
          const isNowActive = clickedButton.classList.toggle("is-active");
          const urlOption = clickedButton.dataset.code;
          let values = params.get("options")?.split("-").filter(Boolean) || [];
          const index = values.indexOf(urlOption);

          if (isNowActive) {
            if (index === -1) {
              values.push(urlOption);
            }

            let fieldValue;

            if (clickedButton.dataset.secondCodeActivator) {
              const activatorValue = clickedButton.dataset.secondCodeActivator;
              const targetButton = document.querySelector(
                `[data-option-btn][data-code][id*="${activatorValue}"]`,
              );

              if (targetButton && targetButton.id.startsWith("e_")) {
                fieldValue = clickedButton.dataset.valueSecond;
              } else {
                fieldValue = clickedButton.dataset.value;
              }
            } else {
              fieldValue = clickedButton.dataset.value;
            }

            summaryForm.querySelector(
              `[name="${clickedButton.dataset.codeFieldName}"]`,
            ).value = fieldValue;
          } else {
            if (index > -1) {
              values.splice(index, 1);
            }

            summaryForm.querySelector(
              `[name="${clickedButton.dataset.codeFieldName}"]`,
            ).value = "";
          }

          if (values.length) {
            params.set("options", values.join("-"));
          } else {
            params.delete("options");
          }

          const baseUrl = window.location.origin + window.location.pathname;
          const newUrl = `${baseUrl}?${params.toString()}`;

          window.history.replaceState({}, "", newUrl);
        } else {
          const currentActiveButton = controlGroup.querySelector(
            "[data-option-btn].is-active",
          );
          if (currentActiveButton) {
            const currentId = currentActiveButton.id;
            if (currentId.startsWith("e_")) {
              currentActiveButton.id = currentId.replace(/^e_/, "d_");
            }
            currentActiveButton.classList.remove("is-active");
          }

          clickedButton.classList.add("is-active");

          const fieldName = clickedButton.dataset.fieldName;
          const fieldValue = clickedButton.dataset.value;

          summaryForm.querySelector(`[name="${fieldName}"]`).value = fieldValue;
          params.set(fieldName, fieldValue);

          const baseUrl = window.location.origin + window.location.pathname;
          const newUrl = `${baseUrl}?${params.toString()}`;

          window.history.replaceState({}, "", newUrl);
        }
      });
    });

    secondCodeActivatorsMap.forEach((value, key) => {
      const matchingOptions = document.querySelectorAll(
        "[data-option-btn][data-is-option]",
      );

      matchingOptions.forEach((option) => {
        if (option.id && option.id.includes(key)) {
          option.dataset.secondCodeActivatorParent = value;
        }
      });
    });

    const secondCodeActivatorParents = document.querySelectorAll(
      "[data-option-btn][data-second-code-activator-parent]",
    );

    secondCodeActivatorParents.forEach((parent) => {
      parent.addEventListener("click", () => {
        const parentKey = parent.id.slice(2);
        const matchingOptions = Array.from(
          document.querySelectorAll(
            "[data-option-btn][data-second-code-activator]",
          ),
        ).filter((el) => el.dataset.secondCodeActivator === parentKey);

        matchingOptions.forEach((option) => {
          if (option.id.startsWith("e_")) {
            const field = summaryForm.querySelector(
              `[name="${option.dataset.codeFieldName}"]`,
            );
            if (field) {
              if (parent.id.startsWith("e_")) {
                field.value = option.dataset.valueSecond;
              } else if (parent.id.startsWith("d_")) {
                field.value = option.dataset.value;
              }
            }
          }
        });
      });
    });

    relatedOptionsMap.forEach((value, key) => {
      const matchingOptions = document.querySelectorAll(
        "[data-option-btn][data-is-option]",
      );

      matchingOptions.forEach((option) => {
        if (option.id && option.id.includes(key)) {
          option.dataset.relatedParent = value.join(", ");
        }
      });
    });

    const relatedOptionParents = document.querySelectorAll(
      "[data-option-btn][data-related-parent]",
    );

    relatedOptionParents.forEach((parent) => {
      parent.addEventListener("click", () => {
        const parentId = parent.id;
        const parentKey = parentId.slice(2);
        const matchingOptions = Array.from(
          document.querySelectorAll("[data-option-btn][data-related]"),
        ).filter((el) => el.dataset.related === parentKey);

        if (parentId.startsWith("d_")) {
          matchingOptions.forEach((option) => {
            if (option.id.startsWith("e_")) {
              option.click();
            }
          });
        }
      });
    });
  }

  // End of Options

  // Countries Select
  fetch(`${frontOrigin}/countries.json`)
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((countries) => {
      const select = document.getElementById("form-country");
      if (select) {
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a country";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        countries.forEach((country) => {
          const option = document.createElement("option");
          option.value = country;
          option.textContent = country;
          select.appendChild(option);
        });
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
  // End of Countries Select

  // Phone Input Mask
  const phoneInputs = document.querySelectorAll("[type=tel]");

  phoneInputs.forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^\d+\-() ]/g, "");
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text");
      const cleaned = pasted.replace(/[^\d+\-() ]/g, "");
      document.execCommand("insertText", false, cleaned);
    });
  });
  // End of Phone Input Mask

  // Copy Link
  document.querySelectorAll("[data-copy-url]").forEach((item) => {
    item.addEventListener("click", () => {
      const address = window.location.href;
      const successBlock = item.querySelector("[data-success]");
      let delay = 1000;

      if (successBlock) {
        if (successBlock.classList.contains("is-active")) {
          delay += 200; // 200 transition duration
          successBlock.classList.remove("is-active");
          setTimeout(() => {
            successBlock.classList.add("is-active");
          }, 200);
        } else {
          successBlock.classList.add("is-active");
        }

        setTimeout(() => {
          successBlock.classList.remove("is-active");
        }, delay);
      }

      navigator.clipboard.writeText(address).catch((err) => {
        console.error("Error copying address:", err);
      });
    });
  });
  // End of Copy Link

  // Apply URL Params
  function applyInitialState() {
    const url = new URL(window.location);
    const params = Array.from(new URLSearchParams(url.search).entries());

    if (params.length > 1) {
      params.forEach(([key, value]) => {
        if (key !== "id") {
          if (key === "options") {
            value.split("-").forEach((opt) => {
              let btn = document.querySelector(
                `[data-option-btn][data-code="${opt}"][id^="d_"]`,
              );

              if (btn === null) {
                btn = document.querySelector(
                  `[data-option-btn][data-code="${opt}"]`,
                );
              }

              btn?.click();
              console.log("click");
              console.log(btn);
              console.log(" ");
            });
          } else {
            let btn = document.querySelector(
              `[data-field-name="${key}"][data-value="${value}"][id^="d_"]`,
            );

            if (btn === null) {
              btn = document.querySelector(
                `[data-field-name="${key}"][data-value="${value}"]`,
              );
            }

            btn?.click();
            console.log("click");
            console.log(btn);
            console.log(" ");
          }
        }
      });
    } else {
      const initialColorsAndOptions = JSON.parse(
        sessionStorage.getItem("initialColorsAndOptions") || "[]",
      );

      if (Array.isArray(initialColorsAndOptions)) {
        initialColorsAndOptions.forEach((value) => {
          let btn = document.querySelector(
            `[data-option-btn][id="d_${value}"]`,
          );

          if (btn === null) {
            btn = document.querySelector(`[data-option-btn][id="${value}"]`);
          }

          btn?.click();
          console.log("click");
          console.log(btn);
          console.log(" ");
        });
      }
    }
  }

  // End of Apply URL Params

  // Form Submit
  document
    .getElementById("form-open-modal-btn")
    ?.addEventListener("click", async () => {
      const linkInput = document.querySelector('input[name="link"]');
      const screenInput = document.querySelector('input[name="screen"]');

      if (linkInput) linkInput.value = window.location.href;
      if (!screenInput) return;

      screenInput.value = "";

      try {
        const dataUrl = await captureScreenshot({ iframeEl: modelIframe });
        screenInput.value = dataUrl;
      } catch (e) {
        console.warn("Screenshot failed:", e);
        screenInput.value = "";
      }
    });

  const form = document.getElementById("summary-form");
  const submitBtn = form.querySelector("#summary-form-submit");
  const error = form.querySelector("#summary-form-error");
  const popupClose = document.querySelector('[data-popup-close="form"]');
  const successTrigger = document.querySelector(
    '[data-popup-open="form-success"]',
  );

  /*form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.reportValidity()) return;

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    const formData = new FormData(form);

    async function compressToLimit(base64, maxLength = 50000) {
      let quality = 0.8;
      let maxWidth = 1200;
      let maxHeight = 1200;
    
      while (quality > 0.1) {
        const compressed = await compressImage(base64, {
          maxWidth,
          maxHeight,
          quality
        });
    
        console.log("try:", quality, maxWidth, compressed.length);
    
        if (compressed.length <= maxLength) {
          return compressed;
        }
    
        // 🔽 спочатку зменшуємо якість
        if (quality > 0.3) {
          quality -= 0.1;
        } else {
          // 🔽 потім починаємо зменшувати розмір
          maxWidth *= 0.8;
          maxHeight *= 0.8;
        }
      }
    
      // ❗ ФІНАЛЬНИЙ fail-safe
      console.warn("Image too large, dropping");
    
      return null; // або "" або взагалі видалити поле
    }

    
    if (formData.has("screen")) {
      let screen = formData.get("screen");
    
      // якщо це File/Blob → конвертуємо в base64
      if (screen instanceof File || screen instanceof Blob) {
        screen = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(screen);
        });
      }
    
      // якщо це string (base64)
      if (typeof screen === "string") {
        if (screen.length > 50000) {
          screen = await compressToLimit(screen, 50000);
      }

     if (screen) {
        formData.set("screen", screen);
      } else {
        formData.delete("screen");
      }
    }}

    const plainData = Object.fromEntries(formData.entries());


    try {
      const response = await fetch(`${apiOrigin}/cms/boats/send-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plainData),
      });

      const result = await response.json();

      if (response.ok) {
        popupClose.click();
        setTimeout(() => {
          successTrigger.click();
          form.reset();
        }, popupDuration * 500);
      } else {
        console.error("Server error:", result);
        error.classList.add("is-shown");
        setTimeout(() => {
          error.classList.remove("is-shown");
        }, 5000);
      }
    } catch (error) {
      console.error("Network error:", error);
    } finally {
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, popupDuration * 1000);
    }
  });*/
  // End of Form Submit

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.reportValidity()) return;

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    const formData = new FormData(form);

    async function compressImage(base64, {
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
} = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // 🔽 зменшуємо пропорційно
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 🔽 стискаємо
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

      resolve(compressedBase64);
    };

    img.onerror = reject;
    img.src = base64;
  });
}

    async function compressToLimit(base64, maxLength = 50000) {
      let quality = 0.8;
      let maxWidth = 1200;
      let maxHeight = 1200;
    
      while (quality > 0.1) {
        const compressed = await compressImage(base64, {
          maxWidth,
          maxHeight,
          quality
        });
    
        console.log("try:", quality, maxWidth, compressed.length);
    
        if (compressed.length <= maxLength) {
          return compressed;
        }
    
        // 🔽 спочатку зменшуємо якість
        if (quality > 0.3) {
          quality -= 0.1;
        } else {
          // 🔽 потім починаємо зменшувати розмір
          maxWidth *= 0.8;
          maxHeight *= 0.8;
        }
      }
    
      // ❗ ФІНАЛЬНИЙ fail-safe
      console.warn("Image too large, dropping");
    
      return null; // або "" або взагалі видалити поле
    }
    

    if (formData.has("screen")) {
      let screen = formData.get("screen");
    
      // якщо це File/Blob → конвертуємо в base64
      if (screen instanceof File || screen instanceof Blob) {
        screen = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(screen);
        });
      }
    
      // якщо це string (base64)
      if (typeof screen === "string") {
        if (screen.length > 50000) {
          screen = await compressToLimit(screen, 50000);
        }

       if (screen) {
          formData.set("screen", screen);
        } else {
          formData.delete("screen");
        }
    }}

    
    const plainData = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`${apiOrigin}/cms/boats/send-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plainData),
      });

      const result = await response.json();

      if (response.ok) {
        popupClose.click();
        setTimeout(() => {
          successTrigger.click();
          form.reset();
        }, popupDuration * 500);
      } else {
        console.error("Server error:", result);
        error.classList.add("is-shown");
        setTimeout(() => {
          error.classList.remove("is-shown");
        }, 5000);
      }
    } catch (error) {
      console.error("Network error:", error);
    } finally {
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, popupDuration * 1000);
    }
  });
  // End of Form Submit
  
  // Disabling features before click
  let skipNextClick = false;
  const checkFeaturesElements = document.querySelectorAll(
    "#screenshot_mobile, #screenshot_desktop, #form-open-modal-btn",
  );

  checkFeaturesElements.forEach((el) => {
    el.addEventListener("click", (e) => {
      if (skipNextClick) {
        skipNextClick = false;
        return;
      }

      const toggleFeaturesBtn = document.getElementById("e_toggle_features");

      if (toggleFeaturesBtn) {
        e.preventDefault();
        e.stopImmediatePropagation();

        toggleFeaturesBtn.click();
        skipNextClick = true;
        setTimeout(() => {
          el.click();
        }, 100);
      }
    });
  });
  // End of Disabling features before click
});
