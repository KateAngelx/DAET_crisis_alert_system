import React from "react";

import { AdminPanel } from "@/app/components/admin/AdminPanel";



/** Admin table inside the standard panel shell (header + scrollable body). */

export function AdminTablePanel({ title, subtitle, action, children, className = "" }) {

  return (

    <AdminPanel

      title={title}

      subtitle={subtitle}

      action={action}

      className={className}

      noPadding

      bodyClassName="overflow-x-auto"

    >

      {children}

    </AdminPanel>

  );

}



export const adminTableClasses = {

  headRow: "border-b border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400",

  headCell: "p-4 text-left",

  bodyRow: "border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors",

  bodyCell: "p-4",

  table: "w-full text-sm text-left",

};

