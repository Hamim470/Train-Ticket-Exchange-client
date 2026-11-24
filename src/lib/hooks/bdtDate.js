"use client";

import { useState, useEffect } from "react";

export function getBdtTodayString() {
  const bdt = new Date(Date.now() + 6 * 60 * 60 * 1000);
  return bdt.toISOString().split("T")[0];
}

export function useBdtMinDate() {
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDate(getBdtTodayString());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return minDate;
}