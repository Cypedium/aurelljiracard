// A shadcn/ui-style Switch on radix-ui (already a dependency). Green when on; danger = red (read-only mode)
"use client"

import * as React from "react"
import { cn } from "@/app/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  danger = false,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { danger?: boolean }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full border-0 bg-[#8590a2] p-[3px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "data-[state=checked]:bg-[#c9372c]" : "data-[state=checked]:bg-[#22a06b]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
