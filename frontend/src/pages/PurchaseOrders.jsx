import React, { useEffect, useMemo, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { Icon } from "../components/Icon.jsx";
import { purchaseOrdersApi } from "../api/purchaseOrders.js";
import { ApiClientError } from "../api/client.js";

const emptyItem = () => ({ itemName: "", description: "", quantity: 1, unit: "pcs", unitPrice: 0 });

const companyDetails = {
  name: "ADITRI CONSTRUCTIONS SERVICES",
  address: "A, Naini, Prayagraj, Uttar Pradesh - 211008",
  mobile: "+91-9598033414",
  email: "aditri.c.services@gmail.com",
  gst: "09CDYPM7630P1ZC",
  representative: "Sandeep Kumar Mishra",
};

const templateStorageKey = "purchaseOrderTemplateContent";

const defaultTemplateContent = {
  billing: {
    companyName: companyDetails.name,
    address: companyDetails.address,
    mobile: companyDetails.mobile,
    email: companyDetails.email,
    gst: companyDetails.gst,
    representative: companyDetails.representative,
  },
  firstParagraph: "We are pleased to place an order for the construction of G+4 Commercial building, subjected to the terms and conditions mentioned in the Purchase Order",
  placeOfSupplyAddress: "JainX Cyber City, Plot No-19, KP- V, Greater Noida, Gautam Buddh Nagar, Uttar Pradesh - 201310",
  terms: [
    {
      heading: "Place of Supply",
      content: "All services under this PO shall be carried out at:",
    },
    {
      heading: "Client Approval",
      content: "The final measurement and certification of all executed quantities shall be subject to the Client's verification and written approval. Any payment shall be based on the quantities approved by the Client.",
    },
    {
      heading: "Payment Terms",
      content: "Rs 364161 have been given as a advance payment.\nThe quoted price is inclusive of 18% GST. Payment shall be released between the date of month 7 to 14 of submission of invoice along with all required supporting documents, subject to approval of measurements by the client.",
    },
    {
      heading: "Delivery",
      content: "The material shall be delivered within 10 to 15 days from the date of issuance of the Purchase Order (PO).",
    },
    {
      heading: "PO Validity",
      content: "This Purchase Order shall remain valid for a period of 3 months from the date of issue, unless extended by mutual written consent.",
    },
    {
      heading: "Jurisdiction",
      content: "All disputes shall be subject to Prayagraj jurisdiction only.",
    },
  ],
};

const emptyForm = () => ({
  poNumber: "",
  vendorName: "",
  vendorContactPerson: "",
  vendorEmail: "",
  vendorPhone: "",
  vendorAddress: "",
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDeliveryDate: "",
  status: "draft",
  currency: "INR",
  items: [emptyItem()],
  taxAmount: 0,
  shippingCost: 0,
  discountAmount: 0,
  notes: "",
  termsAndConditions: "",
});

function normalizeTemplateContent(value = {}) {
  return {
    ...defaultTemplateContent,
    ...value,
    billing: {
      ...defaultTemplateContent.billing,
      ...(value.billing || {}),
    },
    terms: Array.isArray(value.terms) && value.terms.length
      ? value.terms.map((term) => ({
        heading: term.heading || "",
        content: term.content || "",
      }))
      : defaultTemplateContent.terms,
  };
}

function readTemplateContent() {
  try {
    const saved = window.localStorage.getItem(templateStorageKey);
    return normalizeTemplateContent(saved ? JSON.parse(saved) : {});
  } catch {
    return normalizeTemplateContent();
  }
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

function getGrandTotal(form) {
  const subtotal = (form.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  return subtotal + Number(form.taxAmount || 0) + Number(form.shippingCost || 0) - Number(form.discountAmount || 0);
}

function formatTemplateDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
}

function toTitleCase(value = "") {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function amountInWords(value) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const underThousand = (num) => {
    const parts = [];
    if (num >= 100) {
      parts.push(`${ones[Math.floor(num / 100)]} Hundred`);
      num %= 100;
    }
    if (num >= 20) {
      parts.push(tens[Math.floor(num / 10)]);
      num %= 10;
    }
    if (num >= 10) {
      parts.push(teens[num - 10]);
      num = 0;
    }
    if (num > 0) parts.push(ones[num]);
    return parts.join(" ");
  };

  let amount = Math.round(Math.abs(Number(value || 0)));
  if (!amount) return "Zero Rupees Only";

  const groups = [
    { value: 10000000, label: "Crore" },
    { value: 100000, label: "Lakh" },
    { value: 1000, label: "Thousand" },
  ];
  const words = [];

  groups.forEach((group) => {
    if (amount >= group.value) {
      words.push(`${underThousand(Math.floor(amount / group.value))} ${group.label}`);
      amount %= group.value;
    }
  });
  if (amount > 0) words.push(underThousand(amount));

  return `${words.join(" ")} Rupees Only`;
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateContent, setTemplateContent] = useState(() => readTemplateContent());
  const [templateDraft, setTemplateDraft] = useState(() => readTemplateContent());

  const load = useCallback(async (query = search) => {
    setLoading(true);
    setError("");
    try {
      const res = await purchaseOrdersApi.list({ search: query, limit: 100 });
      setOrders(res?.data || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't load purchase orders.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load(search);
  }, [load]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load(search);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, load]);

  const grandTotal = useMemo(() => getGrandTotal(form), [form]);

  const openTemplateSettings = () => {
    setTemplateDraft(normalizeTemplateContent(templateContent));
    setTemplateModalOpen(true);
  };

  const saveTemplateSettings = (e) => {
    e.preventDefault();
    const normalized = normalizeTemplateContent(templateDraft);
    setTemplateContent(normalized);
    window.localStorage.setItem(templateStorageKey, JSON.stringify(normalized));
    setTemplateModalOpen(false);
  };

  const resetTemplateSettings = () => {
    const normalized = normalizeTemplateContent();
    setTemplateDraft(normalized);
    setTemplateContent(normalized);
    window.localStorage.setItem(templateStorageKey, JSON.stringify(normalized));
  };

  const updateTemplateBilling = (field, value) => {
    setTemplateDraft((current) => ({
      ...current,
      billing: { ...current.billing, [field]: value },
    }));
  };

  const updateTemplateTerm = (index, field, value) => {
    setTemplateDraft((current) => ({
      ...current,
      terms: current.terms.map((term, i) => (i === index ? { ...term, [field]: value } : term)),
    }));
  };

  const addTemplateTerm = () => {
    setTemplateDraft((current) => ({
      ...current,
      terms: [...current.terms, { heading: "", content: "" }],
    }));
  };

  const removeTemplateTerm = (index) => {
    setTemplateDraft((current) => ({
      ...current,
      terms: current.terms.length > 1 ? current.terms.filter((_, i) => i !== index) : current.terms,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (order) => {
    setEditingId(order._id);
    setForm({
      ...emptyForm(),
      ...order,
      orderDate: order.orderDate ? new Date(order.orderDate).toISOString().slice(0, 10) : "",
      expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 10) : "",
      items: (order.items || []).length ? order.items.map((item) => ({ ...item })) : [emptyItem()],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        orderDate: form.orderDate ? new Date(form.orderDate).toISOString() : null,
        expectedDeliveryDate: form.expectedDeliveryDate ? new Date(form.expectedDeliveryDate).toISOString() : null,
        items: (form.items || []).map((item) => ({ ...item, quantity: Number(item.quantity || 0), unitPrice: Number(item.unitPrice || 0) })),
        taxAmount: Number(form.taxAmount || 0),
        shippingCost: Number(form.shippingCost || 0),
        discountAmount: Number(form.discountAmount || 0),
      };
      if (editingId) {
        await purchaseOrdersApi.update(editingId, payload);
      } else {
        await purchaseOrdersApi.create(payload);
      }
      setModalOpen(false);
      load(search);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save purchase order.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await purchaseOrdersApi.remove(id);
      load(search);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't delete purchase order.");
    }
  };

  const updateItem = (index, field, value) => {
    const nextItems = [...form.items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setForm((current) => ({ ...current, items: nextItems }));
  };

  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
  };

  const downloadPdf = (order) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 42;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const tax = Number(order.taxAmount || 0);
    const shipping = Number(order.shippingCost || 0);
    const discount = Number(order.discountAmount || 0);
    const grandTotal = Number(order.grandTotal || 0);
    let y = 40;

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin - 8, 24, pageWidth - margin * 2 + 16, 54, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PURCHASE ORDER", margin, 54);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated from ACS Ledger • ${formatDate(order.orderDate)}`, margin, 72);

    doc.setDrawColor(215, 215, 215);
    doc.roundedRect(margin, 92, pageWidth - margin * 2, 110, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Vendor details", margin + 12, 112);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const vendorLines = [
      `Vendor Name: ${order.vendorName || ""}`,
      `Contact Person: ${order.vendorContactPerson || ""}`,
      `Email: ${order.vendorEmail || ""}`,
      `Phone: ${order.vendorPhone || ""}`,
      `Address: ${order.vendorAddress || ""}`,
    ];
    vendorLines.forEach((line, index) => {
      const text = doc.splitTextToSize(line, 220);
      doc.text(text, margin + 12, 125 + index * 12);
    });

    doc.setFont("helvetica", "bold");
    doc.text("PO details", pageWidth - margin - 140, 112);
    doc.setFont("helvetica", "normal");
    doc.text(`PO No.: ${order.poNumber || ""}`, pageWidth - margin - 140, 128);
    doc.text(`Date: ${formatDate(order.orderDate)}`, pageWidth - margin - 140, 142);
    doc.text(`Expected Delivery: ${formatDate(order.expectedDeliveryDate)}`, pageWidth - margin - 140, 156);
    doc.text(`Status: ${order.status || "draft"}`, pageWidth - margin - 140, 170);

    y = 220;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Item details", margin, y);
    y += 10;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    const tableHeaders = ["Item", "Qty", "Unit price", "Line total"];
    const colX = [margin, margin + 240, margin + 360, margin + 470];
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    tableHeaders.forEach((header, index) => doc.text(header, colX[index], y));
    y += 14;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    (order.items || []).forEach((item) => {
      const itemName = doc.splitTextToSize(item.itemName || "", 190);
      const qty = `${item.quantity || 0} ${item.unit || "pcs"}`;
      doc.text(itemName, margin, y);
      doc.text(qty, margin + 240, y);
      doc.text(formatMoney(item.unitPrice || 0), margin + 360, y);
      doc.text(formatMoney(item.lineTotal || 0), margin + 470, y);
      y += 14 + Math.max(0, itemName.length - 1) * 8;
    });

    y += 8;
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal: ${formatMoney(subtotal)}`, margin, y);
    y += 12;
    doc.text(`Tax: ${formatMoney(tax)}`, margin, y);
    y += 12;
    doc.text(`Shipping: ${formatMoney(shipping)}`, margin, y);
    y += 12;
    doc.text(`Discount: ${formatMoney(discount)}`, margin, y);
    y += 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Grand Total: ${formatMoney(grandTotal)}`, margin, y);

    if (order.notes) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Notes: ${order.notes}`, margin, pageHeight - 90);
    }
    if (order.termsAndConditions) {
      doc.setFontSize(10);
      doc.text(`Terms: ${order.termsAndConditions}`, margin, pageHeight - 74);
    }
    doc.save(`${order.poNumber || "purchase-order"}.pdf`);
  };

  // Builds the purchase order .docx as a Blob without downloading it, so it can
  // be reused both for the "Download DOCX" button and as the source document
  // sent to the PDF conversion API for "Download PDF".
  const buildPurchaseOrderDocxBlob = async (order) => {
    const templatePath = "/templates/purchase-order-template.docx";
    const wordNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const tax = Number(order.taxAmount || 0);
    const grandTotal = Number(order.grandTotal || subtotal + tax + Number(order.shippingCost || 0) - Number(order.discountAmount || 0));
    const items = (order.items || []).length ? order.items : [emptyItem()];
    const cleanPoNumber = String(order.poNumber || "").replace(/^po[-\s]*/i, "");
    const poDate = formatTemplateDate(order.orderDate);
    const content = normalizeTemplateContent(templateContent);
    const billing = content.billing;

    const templateRes = await fetch(templatePath);
    if (!templateRes.ok) {
      setError("Purchase order template could not be loaded.");
      return null;
    }

    const zip = await JSZip.loadAsync(await templateRes.arrayBuffer());
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) {
      setError("Purchase order template is not valid.");
      return null;
    }

    const xmlText = await documentXmlFile.async("text");
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const parseError = xml.getElementsByTagName("parsererror")[0];
    if (parseError) {
      setError("Purchase order template could not be prepared.");
      return null;
    }

    const textNodes = (node) => Array.from(node.getElementsByTagNameNS(wordNs, "t"));
    const rowsIn = (table) => Array.from(table.getElementsByTagNameNS(wordNs, "tr"));
    const cellsIn = (row) => Array.from(row.getElementsByTagNameNS(wordNs, "tc"));
    const allTextNodes = textNodes(xml);

    const setNodeText = (node, value) => {
      const nodes = textNodes(node);
      if (!nodes.length) return;
      nodes[0].textContent = String(value ?? "");
      nodes.slice(1).forEach((textNode) => {
        textNode.textContent = "";
      });
    };

    const setCellText = (row, cellIndex, value) => {
      const targetCell = cellsIn(row)[cellIndex];
      if (targetCell) setNodeText(targetCell, value);
    };

    const replaceFirstText = (from, to) => {
      const target = allTextNodes.find((node) => node.textContent === from);
      if (target) target.textContent = to;
    };

    const replaceAllText = (from, to) => {
      allTextNodes.forEach((node) => {
        if (node.textContent === from) node.textContent = to;
      });
    };

    const formatPlainAmount = (value, options = {}) => {
      const amount = Number(value || 0);
      return amount.toLocaleString("en-IN", {
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 2,
        useGrouping: false,
      });
    };

    const paragraphText = (paragraph) => textNodes(paragraph).map((node) => node.textContent).join("");
    const paragraphs = () => Array.from(xml.getElementsByTagNameNS(wordNs, "p"));
    const setParagraphContaining = (needle, value) => {
      const target = paragraphs().find((paragraph) => paragraphText(paragraph).includes(needle));
      if (target) setNodeText(target, value);
    };

    replaceAllText("035", cleanPoNumber || order.poNumber || "");
    if (poDate) {
      const [day, month, year] = poDate.split("/");
      replaceFirstText("12", day);
      replaceFirstText("/07/2026", `/${month}/${year}`);
    }

    const tables = Array.from(xml.getElementsByTagNameNS(wordNs, "tbl"));
    const detailsRows = tables[0] ? rowsIn(tables[0]) : [];
    if (detailsRows.length >= 6) {
      setCellText(detailsRows[1], 0, `Name-${order.vendorName || ""}`);
      setCellText(detailsRows[2], 0, `Address - ${order.vendorAddress || ""}`);
      setCellText(detailsRows[3], 0, `Mobile-${order.vendorPhone || ""}`);
      setCellText(detailsRows[4], 0, `Email: ${order.vendorEmail || ""}`);
      setCellText(detailsRows[5], 0, `GSTRegNo.:${order.vendorGst || order.gstNumber || ""}`);
      setCellText(detailsRows[1], 1, `Name-${billing.companyName || ""}`);
      setCellText(detailsRows[2], 1, `Address - ${billing.address || ""}`);
      setCellText(detailsRows[3], 1, `Mobile-${billing.mobile || ""}`);
      setCellText(detailsRows[4], 1, `Email-${billing.email || ""}`);
      setCellText(detailsRows[5], 1, `GSTRegNo.:${billing.gst || ""}`);
    }

    const priceRows = tables[1] ? rowsIn(tables[1]) : [];
    const itemTemplateRow = priceRows[1];
    const totalRow = priceRows[2];
    if (itemTemplateRow && totalRow) {
      items.slice(1).forEach(() => {
        totalRow.parentNode.insertBefore(itemTemplateRow.cloneNode(true), totalRow);
      });

      const updatedRows = rowsIn(tables[1]);
      const itemRows = updatedRows.slice(1, 1 + items.length);
      const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

      itemRows.forEach((row, index) => {
        const item = items[index] || {};
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const baseTotal = Number(item.lineTotal || quantity * unitPrice);
        const taxShare = tax > 0 && subtotal > 0
          ? tax * (baseTotal / subtotal)
          : tax > 0 && totalQuantity > 0
            ? tax * (quantity / totalQuantity)
            : 0;
        const sgstPerUnit = quantity > 0 ? taxShare / 2 / quantity : 0;
        const cgstPerUnit = quantity > 0 ? taxShare / 2 / quantity : 0;
        const lineTotal = baseTotal + taxShare;
        const description = [item.itemName, item.description].filter(Boolean).join(" ");

        setCellText(row, 0, `${index + 1}.`);
        setCellText(row, 1, item.hsnSacCode || item.hsnCode || "");
        setCellText(row, 2, description);
        setCellText(row, 3, formatPlainAmount(quantity));
        setCellText(row, 4, item.unit || "Nos");
        setCellText(row, 5, formatPlainAmount(unitPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setCellText(row, 6, formatPlainAmount(sgstPerUnit));
        setCellText(row, 7, formatPlainAmount(cgstPerUnit));
        setCellText(row, 8, formatPlainAmount(lineTotal));
      });

      const refreshedRows = rowsIn(tables[1]);
      const refreshedTotalRow = refreshedRows[refreshedRows.length - 1];
      setCellText(refreshedTotalRow, 8, formatPlainAmount(grandTotal));
    }

    const amountParagraph = Array.from(xml.getElementsByTagNameNS(wordNs, "p")).find((paragraph) => {
      const text = textNodes(paragraph).map((node) => node.textContent).join("");
      return text.includes("Six Lakh Seventeen");
    });
    if (amountParagraph) setNodeText(amountParagraph, `               ${amountInWords(grandTotal)}`);

    // The template has one fixed paragraph per original heading (Place of Supply,
    // Client Approval, ...), so writing content.terms[N] into a fixed slot only
    // works while the list has exactly 6 entries in that exact order. As soon as a
    // heading is added or removed the array shifts and slots go out of sync (a
    // removed heading resurfaces a stale default like "Jurisdiction" further down).
    // Instead, rebuild this whole section from scratch: one heading+content block
    // per entry in content.terms, matching how the PDF renders the same list.
    const body = xml.getElementsByTagNameNS(wordNs, "body")[0];
    const brTemplate = xml.getElementsByTagNameNS(wordNs, "br")[0];

    const setNodeTextMultiline = (paragraph, value) => {
      const runs = Array.from(paragraph.getElementsByTagNameNS(wordNs, "r"));
      if (!runs.length) return;
      const templateRun = runs[0].cloneNode(true);
      runs.forEach((run) => run.parentNode.removeChild(run));
      String(value ?? "").split("\n").forEach((line, index) => {
        const run = templateRun.cloneNode(true);
        const runTexts = Array.from(run.getElementsByTagNameNS(wordNs, "t"));
        runTexts.slice(1).forEach((extra) => extra.parentNode.removeChild(extra));
        if (index > 0 && brTemplate) run.insertBefore(brTemplate.cloneNode(true), runTexts[0] || null);
        if (runTexts[0]) {
          runTexts[0].textContent = line;
          runTexts[0].setAttribute("xml:space", "preserve");
        }
        paragraph.appendChild(run);
      });
    };

    const termsHeadingParagraph = paragraphs().find((p) => paragraphText(p).trim() === "Terms and Conditions");
    if (body && termsHeadingParagraph) {
      const headingTemplate = paragraphs().find((p) => paragraphText(p).trim() === "Client Approval")?.cloneNode(true);
      const contentTemplate = paragraphs().find((p) => paragraphText(p).includes("final measurement and certification"))?.cloneNode(true);
      const addressTemplate = paragraphs().find((p) => paragraphText(p).includes("JainX Cyber City"))?.cloneNode(true);
      const deliveryContent = paragraphs().find((p) => paragraphText(p).includes("material shall be delivered"));
      const blankTemplate = deliveryContent?.nextElementSibling?.cloneNode(true);
      const sectPr = Array.from(body.childNodes).find((node) => node.nodeType === 1 && node.localName === "sectPr");

      // Remove every existing heading/content paragraph in the section, keeping
      // the blank spacer directly under "Terms and Conditions" and the section end.
      let cursor = termsHeadingParagraph.nextElementSibling?.nextElementSibling;
      while (cursor && cursor !== sectPr) {
        const next = cursor.nextElementSibling;
        body.removeChild(cursor);
        cursor = next;
      }

      if (headingTemplate && contentTemplate && blankTemplate) {
        content.terms.forEach((term) => {
          if (!term.heading && !term.content) return;
          const headingLower = (term.heading || "").toLowerCase();
          const nodes = [];

          const heading = headingTemplate.cloneNode(true);
          setNodeText(heading, term.heading || "Term");
          nodes.push(heading);

          const contentNode = contentTemplate.cloneNode(true);
          setNodeTextMultiline(contentNode, term.content || "");
          nodes.push(contentNode);

          if (headingLower.includes("place") && addressTemplate && content.placeOfSupplyAddress) {
            const address = addressTemplate.cloneNode(true);
            setNodeTextMultiline(address, content.placeOfSupplyAddress);
            nodes.push(address);
          }

          nodes.push(blankTemplate.cloneNode(true));

          nodes.forEach((node) => {
            if (sectPr) body.insertBefore(node, sectPr);
            else body.appendChild(node);
          });
        });
      }
    }

    setParagraphContaining("We are pleased to place an order", content.firstParagraph);

    zip.file("word/document.xml", new XMLSerializer().serializeToString(xml));

    const updateZipXml = async (path, updater) => {
      const xmlFile = zip.file(path);
      if (!xmlFile) return;
      const parsedXml = new DOMParser().parseFromString(await xmlFile.async("text"), "application/xml");
      const localTextNodes = (node) => Array.from(node.getElementsByTagNameNS(wordNs, "t"));
      const localSetNodeText = (node, value) => {
        const nodes = localTextNodes(node);
        if (!nodes.length) return;
        nodes[0].textContent = String(value ?? "");
        nodes.slice(1).forEach((textNode) => {
          textNode.textContent = "";
        });
      };
      // The footer's contact line lives in a floating text box: the paragraph that
      // hosts the drawing also recursively contains the address/mobile/email
      // paragraphs nested inside it via getElementsByTagNameNS. Searching the full,
      // unfiltered list matches that outer host paragraph for all three lookups
      // (it contains all three strings), so every lookup resolved to the same node
      // and each subsequent write wiped out the previous one's text. Restricting to
      // "leaf" paragraphs (no nested <w:p> of their own) selects the actual
      // individually-positioned address/mobile/email paragraph for each lookup.
      const localParagraphs = Array.from(parsedXml.getElementsByTagNameNS(wordNs, "p"))
        .filter((paragraph) => paragraph.getElementsByTagNameNS(wordNs, "p").length === 0);
      const localParagraphText = (paragraph) => localTextNodes(paragraph).map((node) => node.textContent).join("");
      updater(localParagraphs, localParagraphText, localSetNodeText);
      zip.file(path, new XMLSerializer().serializeToString(parsedXml));
    };

    await updateZipXml("word/header2.xml", (localParagraphs, localParagraphText, localSetNodeText) => {
      const companyParagraph = localParagraphs.find((paragraph) => localParagraphText(paragraph).includes("ditri Constructions"));
      const gstParagraph = localParagraphs.find((paragraph) => localParagraphText(paragraph).includes("GSTIN"));
      if (companyParagraph) localSetNodeText(companyParagraph, toTitleCase(billing.companyName));
      if (gstParagraph) localSetNodeText(gstParagraph, `GSTIN-${billing.gst || ""}`);
    });

    await updateZipXml("word/footer1.xml", (localParagraphs, localParagraphText, localSetNodeText) => {
      const addressParagraph = localParagraphs.find((paragraph) => localParagraphText(paragraph).includes("CONTACTADDRESS"));
      const mobileParagraph = localParagraphs.find((paragraph) => localParagraphText(paragraph).includes("Mobile"));
      const emailParagraph = localParagraphs.find((paragraph) => localParagraphText(paragraph).includes("Emailid"));
      if (addressParagraph) localSetNodeText(addressParagraph, `CONTACTADDRESS:-${billing.address || ""}`);
      if (mobileParagraph) localSetNodeText(mobileParagraph, `Mobile:-${billing.mobile || ""}`);
      if (emailParagraph) localSetNodeText(emailParagraph, `Emailid:${billing.email || ""}`);
    });

    return zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadDocx = async (order) => {
    const blob = await buildPurchaseOrderDocxBlob(order);
    if (!blob) return;
    downloadBlob(blob, `${order.poNumber || "purchase-order"}.docx`);
  };

  const downloadPdfViaConversion = async (order) => {
    setError("");
    setConvertingId(order._id);
    try {
      const docxBlob = await buildPurchaseOrderDocxBlob(order);
      if (!docxBlob) return;
      const pdfBlob = await purchaseOrdersApi.convertDocxToPdf(docxBlob);
      downloadBlob(pdfBlob, `${order.poNumber || "purchase-order"}.pdf`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't convert purchase order to PDF.");
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div>
      <div className="pageHead">
        <div>
          <h1>Purchase Orders</h1>
          <p>Create, search, edit, and keep purchase orders for vendor reference.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn btn--ghost" onClick={openTemplateSettings}>
            <Icon name="edit" size={16} /> Template content
          </button>
          <button className="btn btn--primary" onClick={openCreate}>
            <Icon name="plus" size={16} /> New purchase order
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="poSearch">Search by PO number or vendor</label>
          <input id="poSearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Enter PO number or vendor name" />
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <span className="spinner" />
        </div>
      ) : orders.length === 0 ? (
        <div className="emptyState panel">No purchase orders found.</div>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>PO No.</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Grand total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>{order.poNumber}</td>
                  <td>{order.vendorName}</td>
                  <td>{formatDate(order.orderDate)}</td>
                  <td>{formatMoney(order.grandTotal || 0)}</td>
                  <td>
                    <div className="rowActions">
                      <button className="iconBtn" onClick={() => openEdit(order)} aria-label="Edit purchase order">
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        className="iconBtn"
                        onClick={() => downloadPdfViaConversion(order)}
                        aria-label="Download PDF"
                        disabled={convertingId === order._id}
                      >
                        {convertingId === order._id ? <span className="spinner" /> : <Icon name="chart" size={14} />}
                      </button>
                      <button className="iconBtn" onClick={() => downloadDocx(order)} aria-label="Download DOCX">
                        <Icon name="layers" size={14} />
                      </button>
                      <button className="iconBtn" onClick={() => handleDelete(order._id)} aria-label="Delete purchase order">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {templateModalOpen && (
        <div className="modalOverlay" onMouseDown={(e) => e.target === e.currentTarget && setTemplateModalOpen(false)}>
          <form className="modal" style={{ maxWidth: 980, width: "95%", maxHeight: "90vh", overflowY: "auto" }} onSubmit={saveTemplateSettings}>
            <div className="modal__head">
              <h2>Purchase order template content</h2>
              <button type="button" className="iconBtn" onClick={() => setTemplateModalOpen(false)} aria-label="Close">
                <Icon name="close" size={15} />
              </button>
            </div>

            <div className="panel" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Billing details</h3>
              <div className="grid grid--2">
                <div className="field">
                  <label>Company name</label>
                  <input value={templateDraft.billing.companyName} onChange={(e) => updateTemplateBilling("companyName", e.target.value)} />
                </div>
                <div className="field">
                  <label>GSTIN</label>
                  <input value={templateDraft.billing.gst} onChange={(e) => updateTemplateBilling("gst", e.target.value)} />
                </div>
                <div className="field">
                  <label>Mobile</label>
                  <input value={templateDraft.billing.mobile} onChange={(e) => updateTemplateBilling("mobile", e.target.value)} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={templateDraft.billing.email} onChange={(e) => updateTemplateBilling("email", e.target.value)} />
                </div>
                <div className="field">
                  <label>Representative</label>
                  <input value={templateDraft.billing.representative} onChange={(e) => updateTemplateBilling("representative", e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>Address</label>
                  <textarea value={templateDraft.billing.address} onChange={(e) => updateTemplateBilling("address", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="panel" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Opening content</h3>
              <div className="field">
                <label>First paragraph after Dear Sir</label>
                <textarea
                  value={templateDraft.firstParagraph}
                  onChange={(e) => setTemplateDraft((current) => ({ ...current, firstParagraph: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Place of supply address</label>
                <textarea
                  value={templateDraft.placeOfSupplyAddress}
                  onChange={(e) => setTemplateDraft((current) => ({ ...current, placeOfSupplyAddress: e.target.value }))}
                />
              </div>
            </div>

            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Terms and conditions</h3>
                <button type="button" className="btn btn--ghost btn--sm" onClick={addTemplateTerm}>
                  Add heading
                </button>
              </div>

              {templateDraft.terms.map((term, index) => (
                <div key={index} className="grid grid--2" style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border-soft)" }}>
                  <div className="field">
                    <label>Heading {index + 1}</label>
                    <input value={term.heading} onChange={(e) => updateTemplateTerm(index, "heading", e.target.value)} />
                  </div>
                  <div className="field" style={{ alignSelf: "end" }}>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => removeTemplateTerm(index)} disabled={templateDraft.terms.length <= 1}>
                      Remove heading
                    </button>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Content</label>
                    <textarea value={term.content} onChange={(e) => updateTemplateTerm(index, "content", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="modal__actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn--ghost" onClick={resetTemplateSettings}>
                Reset default
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setTemplateModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                Save template content
              </button>
            </div>
          </form>
        </div>
      )}

      {modalOpen && (
        <div className="modalOverlay" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <form className="modal" style={{ maxWidth: 980, width: "95%", maxHeight: "90vh", overflowY: "auto" }} onSubmit={handleSubmit}>
            <div className="modal__head">
              <h2>{editingId ? "Edit purchase order" : "New purchase order"}</h2>
              <button type="button" className="iconBtn" onClick={() => setModalOpen(false)} aria-label="Close">
                <Icon name="close" size={15} />
              </button>
            </div>

            <div className="grid grid--2">
              <div className="field">
                <label>PO Number</label>
                <input required value={form.poNumber} onChange={(e) => setForm((c) => ({ ...c, poNumber: e.target.value }))} />
              </div>
              <div className="field">
                <label>Vendor name</label>
                <input required value={form.vendorName} onChange={(e) => setForm((c) => ({ ...c, vendorName: e.target.value }))} />
              </div>
              <div className="field">
                <label>Contact person</label>
                <input value={form.vendorContactPerson} onChange={(e) => setForm((c) => ({ ...c, vendorContactPerson: e.target.value }))} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.vendorEmail} onChange={(e) => setForm((c) => ({ ...c, vendorEmail: e.target.value }))} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.vendorPhone} onChange={(e) => setForm((c) => ({ ...c, vendorPhone: e.target.value }))} />
              </div>
              <div className="field">
                <label>Order date</label>
                <input type="date" value={form.orderDate} onChange={(e) => setForm((c) => ({ ...c, orderDate: e.target.value }))} />
              </div>
              <div className="field">
                <label>Expected delivery</label>
                <input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((c) => ({ ...c, expectedDeliveryDate: e.target.value }))} />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="partially_received">Partially received</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="field">
                <label>Currency</label>
                <input value={form.currency} onChange={(e) => setForm((c) => ({ ...c, currency: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Vendor address</label>
                <textarea value={form.vendorAddress} onChange={(e) => setForm((c) => ({ ...c, vendorAddress: e.target.value }))} />
              </div>
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Items</h3>
                <button type="button" className="btn btn--ghost btn--sm" onClick={addItem}>Add item</button>
              </div>
              {(form.items || []).map((item, index) => (
                <div key={index} className="grid grid--2" style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border-soft)" }}>
                  <div className="field">
                    <label>Item name</label>
                    <input required value={item.itemName} onChange={(e) => updateItem(index, "itemName", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <input value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Quantity</label>
                    <input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Unit</label>
                    <input value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Unit price</label>
                    <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, "unitPrice", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Line total</label>
                    <input value={formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0))} readOnly />
                  </div>
                  {form.items.length > 1 && (
                    <div className="field" style={{ gridColumn: "1 / -1" }}>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => removeItem(index)}>
                        Remove item
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid--2" style={{ marginTop: 16 }}>
              <div className="field">
                <label>Tax amount</label>
                <input type="number" min="0" step="0.01" value={form.taxAmount} onChange={(e) => setForm((c) => ({ ...c, taxAmount: e.target.value }))} />
              </div>
              <div className="field">
                <label>Shipping cost</label>
                <input type="number" min="0" step="0.01" value={form.shippingCost} onChange={(e) => setForm((c) => ({ ...c, shippingCost: e.target.value }))} />
              </div>
              <div className="field">
                <label>Discount</label>
                <input type="number" min="0" step="0.01" value={form.discountAmount} onChange={(e) => setForm((c) => ({ ...c, discountAmount: e.target.value }))} />
              </div>
              <div className="field">
                <label>Grand total</label>
                <input value={formatMoney(grandTotal)} readOnly />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Terms and conditions</label>
                <textarea value={form.termsAndConditions} onChange={(e) => setForm((c) => ({ ...c, termsAndConditions: e.target.value }))} />
              </div>
            </div>

            <div className="modal__actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create purchase order"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
