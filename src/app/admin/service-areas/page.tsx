"use client";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ServiceAreaItem } from "@/lib/domain/serviceAreas";

export default function ServiceAreasPage() {
  const [areas, setAreas] = useState<ServiceAreaItem[] | null>(null);
  const [state, setState] = useState("Uttar Pradesh");
  const [district, setDistrict] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/service-areas?all=true");
      const json = await res.json();
      if (json.status === "success") setAreas(json.data);
      else toast.error(json.message || "Could not load districts");
    } catch {
      toast.error("Could not load districts");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (url: string, method: string, body?: object) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (json.status === "success") {
        toast.success(json.message);
        await load();
        return true;
      }
      toast.error(json.message || "Something went wrong");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
    return false;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send("/api/service-areas", "POST", { state, district, isActive: true })) setDistrict("");
  };

  return (
    <div className="p-3 w-full max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Areas we serve</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Customers can book from any town or village inside an active district. Each active district also gets its own page on the website.
      </p>

      <Card className="mb-4">
        <CardContent className="px-6 pb-6 pt-6">
          <form onSubmit={add} className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5 flex-1 min-w-[140px]">
              <label className="text-sm font-medium" htmlFor="area-state">State</label>
              <Input id="area-state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="grid gap-1.5 flex-1 min-w-[140px]">
              <label className="text-sm font-medium" htmlFor="area-district">District</label>
              <Input id="area-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Budaun" />
            </div>
            <Button type="submit" disabled={busy}>Add district</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {areas === null ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-accent">
                  <TableHead className="p-2">District</TableHead>
                  <TableHead className="p-2">State</TableHead>
                  <TableHead className="p-2">Status</TableHead>
                  <TableHead className="p-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="p-2">{a.district}</TableCell>
                    <TableCell className="p-2">{a.state}</TableCell>
                    <TableCell className="p-2">
                      <Badge className={a.isActive ? "bg-green-600" : "bg-gray-400"}>{a.isActive ? "Open for bookings" : "Closed"}</Badge>
                    </TableCell>
                    <TableCell className="p-2 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => send(`/api/service-areas/${a.id}`, "PUT", { state: a.state, district: a.district, isActive: !a.isActive })}
                      >
                        {a.isActive ? "Close" : "Open"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={busy}
                        onClick={() => window.confirm(`Delete ${a.district}?`) && send(`/api/service-areas/${a.id}`, "DELETE")}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
