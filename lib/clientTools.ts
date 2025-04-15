import { ClientToolImplementation } from 'ultravox-client';

// Client-implemented tool for Order Details
export const updateOrderTool: ClientToolImplementation = (parameters) => {
  const { orderDetailsData } = parameters;
  
  try {
    // Log the raw data for debugging
    console.debug("Raw order details data:", orderDetailsData);

    // If the data is already stringified JSON, pass it as is
    // If it's an array or object, stringify it
    const orderItems = typeof orderDetailsData === 'string' 
      ? orderDetailsData 
      : JSON.stringify(orderDetailsData);

    console.debug("Processed order details data:", orderItems);

    if (typeof window !== "undefined") {
      const event = new CustomEvent("orderDetailsUpdated", {
        detail: orderItems
      });
      window.dispatchEvent(event);
    }

    return "Updated the order details.";
  } catch (error) {
    console.error("Error in updateOrderTool:", error);
    return "Failed to update order details.";
  }
};