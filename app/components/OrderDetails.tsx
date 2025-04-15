'use client';

import React, { useState, useEffect } from 'react';
import { OrderDetailsData, OrderItem } from '@/lib/types';

function prepOrderDetails(orderDetailsData: string): OrderDetailsData {
  try {
    console.debug("Raw order details data:", orderDetailsData);

    if (!orderDetailsData) {
      console.warn("No order details data provided");
      return { items: [], totalAmount: 0 };
    }

    let parsedItems: OrderItem[];
    try {
      parsedItems = typeof orderDetailsData === 'string' 
        ? JSON.parse(orderDetailsData)
        : orderDetailsData;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return { items: [], totalAmount: 0 };
    }

    if (!Array.isArray(parsedItems)) {
      console.error("Parsed data is not an array:", parsedItems);
      return { items: [], totalAmount: 0 };
    }

    const validItems = parsedItems.filter(item => {
      return item && 
        typeof item === 'object' && 
        'name' in item && 
        'quantity' in item && 
        'price' in item;
    });

    const orderDetails: OrderDetailsData = {
      items: validItems,
      totalAmount: 0
    };

    console.debug("Processed order details:", orderDetails);
    return orderDetails;
  } catch (error) {
    console.error("Failed to process order details:", error);
    return { items: [], totalAmount: 0 };
  }
}

const OrderDetails: React.FC = () => {
  const [orderDetails, setOrderDetails] = useState<OrderDetailsData>({
    items: [],
    totalAmount: 0
  });

  useEffect(() => {
    const handleOrderUpdate = (event: CustomEvent<string>) => {
      console.debug("Order update event received:", event.detail);
      const formattedData: OrderDetailsData = prepOrderDetails(event.detail);
      setOrderDetails(formattedData);
    };

    const handleCallEnded = () => {
      setOrderDetails({
        items: [],
        totalAmount: 0
      });
    };

    window.addEventListener('orderDetailsUpdated', handleOrderUpdate as EventListener);
    window.addEventListener('callEnded', handleCallEnded as EventListener);

    return () => {
      window.removeEventListener('orderDetailsUpdated', handleOrderUpdate as EventListener);
      window.removeEventListener('callEnded', handleCallEnded as EventListener);
    };
  }, []);

  const getMoodDisplay = (category: string = 'neutral'): string => {
    const categoryMap: { [key: string]: string } = {
      negative: 'Negative / Low Mood Indicator',
      neutral: 'Neutral / Passive Mood Indicator',
      positive: 'Positive / High Mood Indicator',
      distress: 'Distress Indicator'
    };
    return categoryMap[category] || categoryMap.neutral;
  };

  const formatOrderItem = (item: OrderItem, index: number) =>  (
    <div key={index} className="mb-3 sm:mb-4 pl-3 sm:pl-4 border-l-2 border-gray-200">
      <div className="flex flex-col">
        <span className="text-sm sm:text-base font-medium text-gray-700">
          {getMoodDisplay(item.category)}: <span className="text-blue-600">{item.name}</span>
        </span>
        {item.specialInstructions && (
          <div className="text-xs sm:text-sm text-gray-500 italic mt-1">
            Context: {item.specialInstructions}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-6 sm:mt-10">
      <h1 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Conversation Details</h1>
      <div className="shadow-md rounded p-3 sm:p-4">
        <div className="mb-4">
          <span className="text-sm sm:text-base text-gray-400 font-mono mb-2 block">Keywords:</span>
          {orderDetails.items.length > 0 ? (
            orderDetails.items.map((item, index) => formatOrderItem(item, index))
          ) : (
            <span className="text-sm sm:text-base text-gray-500 font-mono">Waiting for Keywords</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;