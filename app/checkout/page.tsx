"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function CheckoutPage() {
  const [step, setStep] = useState<
    "cart" | "shipping" | "payment" | "confirmation"
  >("cart");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const cartItems = [
    { id: 1, name: "SEMA-20", quantity: 2, price: 55.2 },
    { id: 3, name: "RETA-30", quantity: 1, price: 79.2 },
  ];

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = 15.0;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step === "cart") setStep("shipping");
    else if (step === "shipping") setStep("payment");
    else if (step === "payment") setStep("confirmation");
  };

  const handleBack = () => {
    if (step === "shipping") setStep("cart");
    else if (step === "payment") setStep("shipping");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Checkout Header */}
      <section className="bg-gradient-to-b from-primary to-primary/80 text-primary-foreground py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Secure Checkout</h1>
          <p className="text-sm opacity-90 mt-2">
            Research purposes only • 100% Secure Payment
          </p>
        </div>
      </section>

      {/* Progress Steps */}
      <div className="bg-white border-b border-border sticky top-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {["Cart", "Shipping", "Payment", "Confirmation"].map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    (i === 0 && step === "cart") ||
                    (i === 1 &&
                      (step === "shipping" ||
                        step === "payment" ||
                        step === "confirmation")) ||
                    (i === 2 &&
                      (step === "payment" || step === "confirmation")) ||
                    (i === 3 && step === "confirmation")
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className="ml-3 font-medium hidden sm:inline">
                  {label}
                </span>
                {i < 3 && (
                  <ChevronRight className="w-5 h-5 mx-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            {/* Cart Review */}
            {step === "cart" && (
              <Card className="border border-border p-8 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Order Review</h2>
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center pb-4 border-b border-border"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      Research Use Only
                    </p>
                    <p className="text-muted-foreground mt-1">
                      These products are strictly for laboratory research and
                      not intended for human consumption.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Shipping Information */}
            {step === "shipping" && (
              <Card className="border border-border p-8 space-y-6">
                <h2 className="text-2xl font-bold">Shipping Information</h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="NY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Payment Information */}
            {step === "payment" && (
              <Card className="border border-border p-8 space-y-6">
                <h2 className="text-2xl font-bold">Payment Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      name="cardName"
                      value={formData.cardName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      maxLength={19}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        name="expiry"
                        value={formData.expiry}
                        onChange={handleInputChange}
                        maxLength={5}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        CVC
                      </label>
                      <input
                        type="text"
                        name="cvc"
                        value={formData.cvc}
                        onChange={handleInputChange}
                        maxLength={4}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                  This is a demonstration checkout. No real charges will be
                  made.
                </div>
              </Card>
            )}

            {/* Confirmation */}
            {step === "confirmation" && (
              <Card className="border border-border p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                  <div className="text-3xl">✓</div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">Order Confirmed!</h2>
                  <p className="text-muted-foreground mb-6">
                    Thank you for your order. A confirmation email has been sent
                    to {formData.email}.
                  </p>
                  <div className="bg-muted/30 rounded-lg p-6 text-left mb-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      Order Number
                    </p>
                    <p className="font-bold text-lg">
                      #ORD-2025-
                      {Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your order will be processed and shipped within 1-2 business
                    days.
                  </p>
                  <Link href="/">
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border border-border p-6 sticky top-32 space-y-6">
              <h3 className="font-bold text-lg">Order Summary</h3>

              <div className="space-y-3 pb-6 border-b border-border">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping:</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between font-bold text-lg mb-6">
                  <span>Total:</span>
                  <span className="text-accent">${total.toFixed(2)}</span>
                </div>

                <div className="space-y-3">
                  {step !== "confirmation" && (
                    <>
                      <Button
                        onClick={handleNext}
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        {step === "payment" ? "Complete Order" : "Continue"}
                      </Button>
                      {step !== "cart" && (
                        <Button
                          onClick={handleBack}
                          variant="outline"
                          className="w-full bg-transparent"
                        >
                          Back
                        </Button>
                      )}
                    </>
                  )}
                  {step === "confirmation" && (
                    <Link href="/shop">
                      <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        Continue Shopping
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
                Secure 256-bit SSL encryption
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
