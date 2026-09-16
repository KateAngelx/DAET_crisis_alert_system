"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { publicLayout } from "@/app/components/InfoPageHero";
import { portalShell } from "@/lib/designSystem";
import { PublicListModal } from "@/app/components/shell/PublicListModal";

export const PUBLIC_CARD_LIST_LIMIT = 5;

export function PublicCardListPreview({
  items,
  limit = PUBLIC_CARD_LIST_LIMIT,
  renderItem,
  modalTitle,
  modalSubtitle,
  listClassName = publicLayout.stackTight,
  getItemKey,
  renderModalBody,
  scrollPaneClassName = "",
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const safeItems = items ?? [];
  const preview = safeItems.slice(0, limit);
  const hasMore = safeItems.length > limit;
  const extra = safeItems.length - limit;

  const openModal = () => {
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "card-list-preview",
        hypothesisId: "P1",
        location: "PublicCardListPreview.jsx:openModal",
        message: "View more opened for public card list",
        data: { total: safeItems.length, preview: preview.length, limit, modalTitle },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setModalOpen(true);
  };

  const previewBlock = (
    <>
      <div className={listClassName}>
        {preview.map((item, index) => {
          const key = getItemKey ? getItemKey(item, index) : item?.id ?? index;
          return <React.Fragment key={key}>{renderItem(item, index)}</React.Fragment>;
        })}
      </div>
      {hasMore ? (
        <button type="button" onClick={openModal} className={`${portalShell.btnGhost} w-full py-3 mt-3 shrink-0`}>
          View more ({extra} more) <ChevronDown size={14} className="inline" />
        </button>
      ) : null}
    </>
  );

  return (
    <>
      {scrollPaneClassName ? <div className={scrollPaneClassName}>{previewBlock}</div> : previewBlock}
      <PublicListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        subtitle={modalSubtitle ?? `${safeItems.length} total`}
      >
        {renderModalBody ? (
          renderModalBody(safeItems)
        ) : (
          <div className={listClassName}>
            {safeItems.map((item, index) => {
              const key = getItemKey ? getItemKey(item, index) : item?.id ?? index;
              return <React.Fragment key={key}>{renderItem(item, index)}</React.Fragment>;
            })}
          </div>
        )}
      </PublicListModal>
    </>
  );
}
