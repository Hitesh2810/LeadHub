import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchCurrentUserAccess,
  fetchEmailTemplates,
  saveEmailTemplates,
  type EmailTemplates,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const EMPTY_TEMPLATES: EmailTemplates = {
  instantTemplate: "",
  reminderTemplate: "",
};

const SettingsPage = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplates>(EMPTY_TEMPLATES);

  const {
    data: currentUserAccess,
    isLoading: isAccessLoading,
    isError: isAccessError,
  } = useQuery({
    queryKey: ["current-user-access"],
    queryFn: fetchCurrentUserAccess,
  });

  const {
    data: emailTemplates,
    isLoading: isTemplatesLoading,
    isError: isTemplatesError,
  } = useQuery({
    queryKey: ["email-templates"],
    queryFn: fetchEmailTemplates,
    enabled: currentUserAccess?.isAdmin === true,
  });

  useEffect(() => {
    if (emailTemplates) {
      setTemplates(emailTemplates);
    }
  }, [emailTemplates]);

  const saveMutation = useMutation({
    mutationFn: saveEmailTemplates,
    onSuccess: (savedTemplates) => {
      setTemplates(savedTemplates);
      toast({
        title: "Templates saved",
        description: "Email template settings were updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to save templates",
        description: error.message || "Something went wrong while saving email templates.",
        variant: "destructive",
      });
    },
  });

  if (isAccessLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (isAccessError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Starting server... please wait</p>
      </div>
    );
  }

  if (!currentUserAccess?.isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Only admins can manage email templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your account and system settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isTemplatesError && (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Starting server... please wait
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="instantTemplate">
              Instant Follow-Up Template
            </label>
            <textarea
              id="instantTemplate"
              name="instantTemplate"
              placeholder="Enter email content"
              value={templates.instantTemplate}
              onChange={(event) =>
                setTemplates((current) => ({ ...current, instantTemplate: event.target.value }))
              }
              className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              Available placeholders: {`{{name}}`}, {`{{date}}`}, {`{{company}}`}, {`{{AssignedTo}}`}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reminderTemplate">
              Reminder Template
            </label>
            <textarea
              id="reminderTemplate"
              name="reminderTemplate"
              placeholder="Enter email content"
              value={templates.reminderTemplate}
              onChange={(event) =>
                setTemplates((current) => ({ ...current, reminderTemplate: event.target.value }))
              }
              className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current default reminder email content.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate(templates)}
              disabled={saveMutation.isPending || isTemplatesLoading}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
