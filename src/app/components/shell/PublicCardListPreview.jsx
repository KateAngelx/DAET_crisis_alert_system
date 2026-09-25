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
