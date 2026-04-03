import React from "react";
import { Card } from "./ui/Card";
import { Lock } from "lucide-react";

export function PlaceholderModule({ title, icon, description }) {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="text-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <div className="text-gray-400">
              {icon}
            </div>
          </div>
          <Lock size={32} className="text-gray-300" />
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600 mb-4">{description}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-900">
                <strong>This module is part of the full CONNECT-DAET system.</strong>
                <br />
                Functionality not included in this prototype.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}