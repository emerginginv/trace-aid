import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

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
    // Simulate sending feedback
    setTimeout(() => {
      toast.success("Thank you! Your feedback has been submitted.");
      setOpen(false);
      setCategory("");
      setMessage("");
      setLoading(false);
    }, 1000);
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
