"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TenantSwitcher() {
    const { currentTenant, memberships, switchTenant } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!memberships || memberships.length <= 1) {
        return (
            <div className="flex items-center px-4 py-3 text-sm text-gray-700">
                <Building2 className="w-5 h-5 mr-3 text-gray-500" />
                <span className="font-medium truncate">{currentTenant?.name || "No Organization"}</span>
            </div>
        );
    }

    const handleSwitch = (tenantId: string) => {
        switchTenant(tenantId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Switch organization"
            >
                <Building2 className="w-5 h-5 mr-3 text-gray-500" />
                <span className="flex-1 text-left truncate">{currentTenant?.name || "Select Organization"}</span>
                <ChevronDown className={cn(
                    "w-4 h-4 ml-2 text-gray-400 transition-transform",
                    isOpen && "transform rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
                    <div className="py-1" role="listbox" aria-label="Organizations">
                        {memberships.map((membership) => (
                            <button
                                key={membership.tenantId}
                                type="button"
                                onClick={() => handleSwitch(membership.tenantId)}
                                className={cn(
                                    "flex items-center w-full px-4 py-2 text-sm transition-colors",
                                    membership.tenantId === currentTenant?.id
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50"
                                )}
                                role="option"
                                aria-selected={membership.tenantId === currentTenant?.id}
                            >
                                <span className="flex-1 text-left">{membership.tenantName}</span>
                                {membership.tenantId === currentTenant?.id && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 px-4 py-2">
                        <p className="text-xs text-gray-500">
                            {memberships.length} organization{memberships.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
