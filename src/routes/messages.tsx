import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Inbox, Link2, MailOpen, Plus, Send, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MessageComposer } from "@/components/MessageComposer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { actions, useAppData } from "@/data";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@/domain/models";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages | Automation CoE Portfolio Tracker" },
      { name: "description", content: "Send and receive internal messages about automation ideas, projects and production records within the Automation CoE portfolio." },
      { property: "og:title", content: "Messages | Automation CoE Portfolio Tracker" },
      { property: "og:description", content: "Internal user-to-user messaging linked to automation records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

function MessageCard({ message, direction }: { message: Message; direction: "in" | "out" }) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold">
          {message.subject}
          {direction === "in" && !message.readAt ? (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">New</span>
          ) : null}
          {message.resolvedAt ? (
            <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">Done</span>
          ) : null}
        </p>
        <span className="text-xs text-muted-foreground">
          {direction === "in" ? `From ${message.from}` : `To ${message.to}`} · {new Date(message.sentAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{message.body}</p>
      {message.recordId ? (
        <Link
          to="/record/$id"
          params={{ id: message.recordId }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Link2 className="h-3.5 w-3.5" /> {message.recordLabel ?? "View automation"}
        </Link>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {direction === "in" ? (
          <>
            {!message.readAt ? (
              <Button size="sm" variant="secondary" onClick={() => actions.markMessageRead(message.id)}>
                <MailOpen className="h-3.5 w-3.5" /> Mark read
              </Button>
            ) : null}
            {!message.resolvedAt ? (
              <Button size="sm" variant="outline" onClick={() => actions.resolveMessage(message.id)}>
                <Check className="h-3.5 w-3.5" /> Mark done
              </Button>
            ) : null}
          </>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => actions.deleteMessage(message.id)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </li>
  );
}

function MessagesPage() {
  const data = useAppData();
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const all = data.messages ?? [];
  const inbox = all.filter((m) => m.to === user);
  const sent = all.filter((m) => m.from === user);
  const unread = inbox.filter((m) => !m.readAt).length;

  return (
    <AppShell
      title="Messages"
      subtitle="Send notes to teammates and reference a specific automation — recipients see it under Items requiring my attention."
      actions={
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="h-4 w-4" /> New Message
        </Button>
      }
    >
      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="h-4 w-4" /> Inbox{unread ? ` (${unread})` : ""}
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="h-4 w-4" /> Sent ({sent.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <ul className="card-surface divide-y divide-border">
            {inbox.map((m) => (
              <MessageCard key={m.id} message={m} direction="in" />
            ))}
            {inbox.length === 0 ? <li className="px-4 py-10 text-center text-sm text-muted-foreground">Your inbox is empty.</li> : null}
          </ul>
        </TabsContent>
        <TabsContent value="sent">
          <ul className="card-surface divide-y divide-border">
            {sent.map((m) => (
              <MessageCard key={m.id} message={m} direction="out" />
            ))}
            {sent.length === 0 ? <li className="px-4 py-10 text-center text-sm text-muted-foreground">No sent messages yet.</li> : null}
          </ul>
        </TabsContent>
      </Tabs>

      <MessageComposer open={composeOpen} onOpenChange={setComposeOpen} />
    </AppShell>
  );
}
