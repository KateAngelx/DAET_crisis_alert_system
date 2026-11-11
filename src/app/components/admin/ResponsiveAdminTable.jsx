"use client";

import React, { Children, isValidElement, useState } from "react";
import { Eye, List, ChevronRight } from "lucide-react";
import { AdminModalShell } from "@/app/components/admin/AdminModalShell";

function getElement(children, type) {
  return Children.toArray(children).find(
    (child) => isValidElement(child) && child.type === type
  );
}

function getText(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getText).join("");
  if (!isValidElement(node)) return "";
  return getText(node.props.children);
}

function getCells(row) {
  if (!isValidElement(row) || row.type !== "tr") return [];
  return Children.toArray(row.props.children).filter(
    (cell) => isValidElement(cell) && cell.type === "td"
  );
}

function RecordFields({ cells, headers, indexes }) {
  return (
    <dl className="grid min-w-0 gap-2">
      {indexes.map((index) => (
        <div key={index} className="min-w-0">
          <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
            {headers[index] || `Field ${index + 1}`}
          </dt>
          <dd className="mt-0.5 min-w-0 break-words text-xs font-medium leading-relaxed text-zinc-700">
            {cells[index]?.props.children ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ResponsiveAdminTable({ children, label = "Records", desktopClassName = "" }) {
  const [detailRow, setDetailRow] = useState(null);
  const [allOpen, setAllOpen] = useState(false);
  const table = getElement(children, "table");
  const tableParts = table ? Children.toArray(table.props.children) : [];
  const head = tableParts.find((part) => isValidElement(part) && part.type === "thead");
  const body = tableParts.find((part) => isValidElement(part) && part.type === "tbody");
  const headerRow = head
    ? Children.toArray(head.props.children).find((row) => isValidElement(row) && row.type === "tr")
    : null;
  const headers = headerRow
    ? Children.toArray(headerRow.props.children)
      .filter((cell) => isValidElement(cell) && cell.type === "th")
      .map((cell) => getText(cell.props.children).trim())
    : [];
  const rows = (
    body
      ? Children.toArray(body.props.children)
        .map((row, index) => ({ row, cells: getCells(row), id: row.key ?? index }))
        .filter((entry) => (
          entry.cells.length > 0 &&
          !entry.cells.some((cell) => Number(cell.props.colSpan) > 1)
        ))
      : []
  );

  if (!table || headers.length === 0 || rows.length === 0) {
    return <div className="min-w-0">{children}</div>;
  }

  const detailIndexes = headers.map((_, index) => index);
  const visibleIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => !/action|management|details|^view$/i.test(header))
    .slice(0, 3)
    .map(({ index }) => index);
  const actionIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => /details|^view$/i.test(header))
    .map(({ index }) => index);
  const visibleRows = rows.slice(0, 5);

  const renderRecord = (record, index, inModal = false) => (
    <article
      key={record.id ?? index}
      className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
    >
      <RecordFields
        cells={record.cells}
        headers={headers}
        indexes={inModal ? detailIndexes : visibleIndexes}
      />
      {actionIndexes.map((cellIndex) => (
        <div key={cellIndex} className="mt-3 flex min-w-0 flex-wrap gap-2 border-t border-zinc-100 pt-2">
          {record.cells[cellIndex]?.props.children}
        </div>
      ))}
      {!inModal ? (
        <button
          type="button"
          onClick={() => {
            setAllOpen(false);
            setDetailRow(record);
          }}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-black text-blue-700 hover:bg-blue-50"
        >
          <Eye size={14} /> View more <ChevronRight size={14} />
        </button>
      ) : null}
    </article>
  );

  return (
    <>
      <div className={`hidden min-w-0 overflow-x-auto lg:block ${desktopClassName}`}>
        {table}
      </div>
      <section className="space-y-2 lg:hidden" aria-label={`${label} list`}>
        {visibleRows.map((record, index) => renderRecord(record, index))}
        {rows.length > visibleRows.length ? (
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black uppercase tracking-wide text-blue-700 hover:bg-blue-100"
          >
            <List size={15} /> View all {rows.length} records
          </button>
        ) : null}
      </section>

      <AdminModalShell
        open={allOpen}
        onClose={() => setAllOpen(false)}
        title={`${label} (${rows.length})`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-2">
          {rows.map((record, index) => renderRecord(record, index))}
        </div>
      </AdminModalShell>

      <AdminModalShell
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        title="Record details"
        subtitle={detailRow ? getText(detailRow.cells[0]?.props.children).slice(0, 80) : ""}
        maxWidth="max-w-2xl"
      >
        {detailRow ? (
          <RecordFields cells={detailRow.cells} headers={headers} indexes={detailIndexes} />
        ) : null}
      </AdminModalShell>
    </>
  );
}
