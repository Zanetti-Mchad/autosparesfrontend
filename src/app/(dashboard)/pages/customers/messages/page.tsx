"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/apiConfig";
import { formatDisplayDate, isDateInRange } from "@/lib/formatDate";
import { smsService } from "@/lib/sms";
import toast from "react-hot-toast";
import { Filter, Loader2, Mail, MessageSquare, Send } from "lucide-react";

type Customer = {
  id: string;
  customerType?: string;
  name?: string | null;
  companyName?: string | null;
  email?: string | null;
  workEmail?: string | null;
  phone?: string | null;
};

type MessageRow = {
  id: string;
  customerId?: string | null;
  subject: string;
  body: string;
  channel: string;
  status: string;
  createdAt: string;
  customer?: {
    id: string;
    name?: string | null;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    workEmail?: string | null;
  } | null;
};

const SMS_CHAR_LIMIT = 320;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function customerDisplayName(c: Pick<Customer, "name" | "companyName" | "email" | "phone" | "id">) {
  return c.companyName || c.name || c.email || c.phone || c.id;
}

function customerEmail(c: Customer) {
  return (c.workEmail || c.email || "").trim();
}

function customerPhone(c: Customer) {
  return (c.phone || "").trim();
}

export default function MessageCenterPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [channel, setChannel] = useState<"SMS" | "EMAIL" | "INTERNAL">("SMS");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [fromDate, setFromDate] = useState(monthStartISO());
  const [toDate, setToDate] = useState(todayISO());
  const [appliedFrom, setAppliedFrom] = useState(monthStartISO());
  const [appliedTo, setAppliedTo] = useState(todayISO());

  const selected = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId]
  );

  const filteredMessages = useMemo(
    () =>
      messages.filter((m) =>
        isDateInRange(m.createdAt, appliedFrom || undefined, appliedTo || undefined)
      ),
    [messages, appliedFrom, appliedTo]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [custRes, msgRes] = await Promise.all([
        fetchApi("/customers?pageSize=100"),
        fetchApi("/crm/messages"),
      ]);

      const custList = Array.isArray(custRes?.data?.items)
        ? custRes.data.items
        : Array.isArray(custRes?.data?.customers)
          ? custRes.data.customers
          : Array.isArray(custRes?.data)
            ? custRes.data
            : Array.isArray(custRes?.items)
              ? custRes.items
              : Array.isArray(custRes)
                ? custRes
                : [];

      const msgList = Array.isArray(msgRes?.data)
        ? msgRes.data
        : Array.isArray(msgRes)
          ? msgRes
          : [];

      setCustomers(custList);
      setMessages(msgList);
    } catch (e: any) {
      toast.error(e.message || "Failed to load message center");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyDateFilter = () => {
    if (fromDate && toDate && fromDate > toDate) {
      toast.error("From date cannot be after To date");
      return;
    }
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const resetDateFilter = () => {
    const from = monthStartISO();
    const to = todayISO();
    setFromDate(from);
    setToDate(to);
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const resetForm = () => {
    setSubject("");
    setBody("");
  };

  const saveHistory = async (status: string) => {
    await fetchApi("/crm/messages", {
      method: "POST",
      body: JSON.stringify({
        customerId: customerId || null,
        subject: subject.trim() || (channel === "SMS" ? "SMS" : "Message"),
        body: body.trim(),
        channel,
        status,
      }),
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !selected) {
      toast.error("Please select a customer");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (channel === "EMAIL" && !subject.trim()) {
      toast.error("Email subject is required");
      return;
    }
    if (channel === "SMS" && body.trim().length > SMS_CHAR_LIMIT) {
      toast.error(`SMS must be ${SMS_CHAR_LIMIT} characters or fewer`);
      return;
    }

    setSending(true);
    try {
      if (channel === "SMS") {
        const phone = customerPhone(selected);
        if (!phone) {
          toast.error("Selected customer has no phone number");
          setSending(false);
          return;
        }
        const res = await smsService.sendSMS({
          phoneNumber: phone,
          message: body.trim(),
        });
        if (res.status !== "success") {
          await saveHistory("Failed");
          throw new Error(res.message || "SMS failed");
        }
        await saveHistory("Sent");
        toast.success(`SMS sent to ${customerDisplayName(selected)}`);
      } else if (channel === "EMAIL") {
        const email = customerEmail(selected);
        if (!email) {
          toast.error("Selected customer has no email address");
          setSending(false);
          return;
        }
        const response = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            subject: subject.trim(),
            message: body.trim(),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.status === "error") {
          await saveHistory("Failed");
          throw new Error(data.message || "Email failed");
        }
        await saveHistory("Sent");
        toast.success(`Email sent to ${customerDisplayName(selected)}`);
      } else {
        await saveHistory("Sent");
        toast.success("Internal message saved");
      }

      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
          Message Center
        </h1>
        <p className="text-sm text-gray-500">
          Pick a customer by name, choose SMS or Email, then send (same EgoSMS / email flow as schoolnajja)
        </p>
      </div>

      <form onSubmit={handleSend} className="border rounded-xl p-3 sm:p-4 bg-white space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              required
              className="w-full border rounded-lg px-3 py-2 bg-white min-h-10"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {customerDisplayName(c)}
                  {customerPhone(c) ? ` · ${customerPhone(c)}` : ""}
                  {customerEmail(c) ? ` · ${customerEmail(c)}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white min-h-10"
              value={channel}
              onChange={(e) => setChannel(e.target.value as "SMS" | "EMAIL" | "INTERNAL")}
            >
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="INTERNAL">Internal (save only)</option>
            </select>
          </div>
        </div>

        {selected && (
          <div className="text-xs text-gray-600 bg-gray-50 border rounded-lg px-3 py-2">
            To: <span className="font-medium">{customerDisplayName(selected)}</span>
            {channel === "SMS" && (
              <> · Phone: <span className="font-medium">{customerPhone(selected) || "missing"}</span></>
            )}
            {channel === "EMAIL" && (
              <> · Email: <span className="font-medium">{customerEmail(selected) || "missing"}</span></>
            )}
          </div>
        )}

        {channel === "EMAIL" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required={channel === "EMAIL"}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            required
            rows={5}
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={channel === "SMS" ? "SMS message…" : "Message body…"}
          />
          {channel === "SMS" && (
            <p className={`text-xs mt-1 ${body.length > SMS_CHAR_LIMIT ? "text-red-600" : "text-gray-500"}`}>
              {body.length}/{SMS_CHAR_LIMIT} characters
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={sending || loading}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-5 py-2.5 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : channel === "EMAIL" ? <Mail className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending…" : channel === "SMS" ? "Send SMS" : channel === "EMAIL" ? "Send Email" : "Save Message"}
        </button>
      </form>

      <div className="border rounded-xl p-3 sm:p-4 bg-white grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full border rounded-lg px-2 sm:px-3 py-2 bg-white text-sm min-h-10"
          />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border rounded-lg px-2 sm:px-3 py-2 bg-white text-sm min-h-10"
          />
        </div>
        <button
          type="button"
          onClick={applyDateFilter}
          className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 min-h-10"
        >
          <Filter className="w-4 h-4" />
          Apply filter
        </button>
        <button
          type="button"
          onClick={resetDateFilter}
          className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 border rounded-lg px-4 py-2 text-sm bg-white hover:bg-gray-50 min-h-10"
        >
          Reset
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl bg-white hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 w-12 text-gray-500">#</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Channel</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : filteredMessages.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={6}>
                  No messages for this date range
                </td>
              </tr>
            ) : (
              filteredMessages.map((m, i) => {
                const name = m.customer
                  ? customerDisplayName(m.customer)
                  : m.customerId || "—";
                return (
                  <tr key={m.id} className="border-t align-top">
                    <td className="p-3 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-medium">{name}</td>
                    <td className="p-3">
                      <div>{m.subject}</div>
                      <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{m.body}</div>
                    </td>
                    <td className="p-3">{m.channel}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.status === "Sent"
                            ? "bg-emerald-50 text-emerald-700"
                            : m.status === "Failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3">{formatDisplayDate(m.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">Loading...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="border rounded-xl bg-white p-4 text-sm text-gray-500">
            No messages for this date range
          </div>
        ) : (
          filteredMessages.map((m, i) => {
            const name = m.customer
              ? customerDisplayName(m.customer)
              : m.customerId || "—";
            return (
              <div key={m.id} className="border rounded-xl bg-white p-4 space-y-2">
                <div className="flex justify-between gap-2 items-start">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 font-semibold">{i + 1}.</div>
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-sm text-gray-700 truncate">{m.subject || "—"}</div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === "Sent"
                        ? "bg-emerald-50 text-emerald-700"
                        : m.status === "Failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-3">{m.body}</p>
                <div className="text-xs text-gray-500 flex justify-between gap-2">
                  <span>{m.channel}</span>
                  <span>{formatDisplayDate(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
