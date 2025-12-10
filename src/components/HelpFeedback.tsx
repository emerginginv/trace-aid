import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FEEDBACK_EMAIL = "brian@emerginginv.com";

export function HelpFeedback() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!category || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || "Unknown user";
      
      const categoryLabels: Record<string, string> = {
        bug: "Bug Report",
        feature: "Feature Request",
        question: "Question",
        feedback: "General Feedback"
      };

      const emailBody = `
        <h2>New ${categoryLabels[category] || category}</h2>
        <p><strong>From:</strong> ${userEmail}</p>
        <p><strong>Category:</strong> ${categoryLabels[category] || category}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `;

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: FEEDBACK_EMAIL,
          subject: `[Help & Feedback] ${categoryLabels[category] || category}`,
          body: emailBody,
          isHtml: true,
          fromName: "CaseWyze Feedback"
        }
      });

      if (error) throw error;

      toast.success("Thank you! Your feedback has been submitted.");
      setOpen(false);
      setCategory("");
      setMessage("");
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <MessageCircle className="w-4 h-4 mr-2" />
          Help & Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help & Feedback</DialogTitle>
          <DialogDescription>
            Have a question or suggestion? We'd love to hear from you!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="feedback">General Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Describe your issue or suggestion..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? "Sending..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
