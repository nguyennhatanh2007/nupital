"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const loveStoryMilestoneSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  date: z.date({ required_error: "Milestone date is required." }),
  description: z.string().min(5, "Description must be at least 5 characters."),
});

export const weddingInfoSchema = z.object({
  brideName: z.string().min(2, "Bride name must be at least 2 characters."),
  groomName: z.string().min(2, "Groom name must be at least 2 characters."),
  weddingDate: z.date({ required_error: "Wedding date is required." }),
  loveStory: z
    .array(loveStoryMilestoneSchema)
    .min(1, "Add at least one love story milestone."),
});

export type WeddingInfoFormValues = z.infer<typeof weddingInfoSchema>;

type WeddingInfoFormProps = {
  defaultValues?: WeddingInfoFormValues;
  onSubmit: (values: WeddingInfoFormValues) => void | Promise<void>;
};

const defaultFormValues: WeddingInfoFormValues = {
  brideName: "",
  groomName: "",
  weddingDate: new Date(),
  loveStory: [
    {
      title: "",
      date: new Date(),
      description: "",
    },
  ],
};

export function WeddingInfoForm({ defaultValues, onSubmit }: WeddingInfoFormProps) {
  const form = useForm<WeddingInfoFormValues>({
    resolver: zodResolver(weddingInfoSchema),
    defaultValues: defaultValues ?? defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "loveStory",
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 rounded-xl border bg-background p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="brideName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bride Name</FormLabel>
                <FormControl>
                  <Input placeholder="Rose Thomas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="groomName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Groom Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jack Wood" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="weddingDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Wedding Day</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal md:w-[280px]",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Love Story Milestones</h3>
              <FormDescription>Add meaningful relationship moments.</FormDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ title: "", date: new Date(), description: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`loveStory.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="First Meet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`loveStory.${index}.date`}
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`loveStory.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share what happened on this milestone..."
                        className="min-h-[90px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </section>

        <Button type="submit" className="w-full md:w-auto">
          Save Wedding Information
        </Button>
      </form>
    </Form>
  );
}