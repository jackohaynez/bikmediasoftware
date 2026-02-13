import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase-server";
import type { BrokerInsert } from "@/types/supabase";

export async function POST(request: NextRequest) {
  try {
    // Verify the user is an admin
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, name, company } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Use admin client for auth operations (requires service role)
    const adminClient = createAdminClient();

    // Create auth user
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: "broker",
          name,
        },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create broker record using server client (respects admin RLS policies)
    const brokerInsertData: BrokerInsert = {
      id: authData.user.id,
      email,
      name,
      company: company || null,
    };

    const { data: brokerData, error: brokerError } = await supabase
      .from("brokers")
      .insert(brokerInsertData as never)
      .select()
      .single();

    if (brokerError) {
      // Rollback: delete the auth user if broker record fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: brokerError.message }, { status: 500 });
    }

    return NextResponse.json({ broker: brokerData }, { status: 201 });
  } catch (error) {
    console.error("Error creating broker:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verify the user is an admin
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use server client - admin RLS policies will allow access
    const { data: brokers, error } = await supabase
      .from("brokers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ brokers });
  } catch (error) {
    console.error("Error fetching brokers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
