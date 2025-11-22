package com.jun.webserver.controller;

import com.jun.grpc.order.CreateOrderRequest;
import com.jun.grpc.order.CreateOrderResponse;
import com.jun.grpc.order.GetOrdersRequest;
import com.jun.grpc.order.GetOrdersResponse;
import com.jun.grpc.order.OrderServiceGrpc;
import com.jun.grpc.order.UpdateOrderStatusRequest;
import com.jun.webserver.domain.OrderStatus;
import com.jun.webserver.dto.OrderRequestDto;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderController {
    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/orders")
    public List<Map<String, Object>> getOrders(@RequestParam(required = false, defaultValue = "") String customerId) {

        GetOrdersRequest request = GetOrdersRequest.newBuilder()
                .setCustomerId(customerId)
                .build();

        GetOrdersResponse response = orderStub.getOrders(request);

        return response.getOrdersList().stream()
                .map(info -> Map.<String, Object>of(
                        "orderId", info.getOrderId(),
                        "menuName", info.getMenuName(),
                        "price", info.getPrice(),
                        "status", info.getStatus()
                ))
                .collect(Collectors.toList());
    }

    @PostMapping("/orders")
    public String createOrder(@RequestBody OrderRequestDto requestDto) {
        CreateOrderRequest grpcRequest = CreateOrderRequest.newBuilder()
                .setCustomerId(requestDto.getCustomerId())
                .setRestaurantId(requestDto.getRestaurantId())
                .setMenuName(requestDto.getMenuName())
                .setPrice(requestDto.getPrice())
                .build();

        CreateOrderResponse response = orderStub.createOrder(grpcRequest);

        String notificationMessage = "새 주문! [" + requestDto.getMenuName() + "] 주문번호: " + response.getOrderId();
        messagingTemplate.convertAndSend("/sub/orders", notificationMessage);

        return "주문 성공! 주문번호: " + response.getOrderId();
    }

    // 통합 상태 변경 API (수락, 거절, 조리완료, 배달시작, 배달완료 모두 처리)
    @PostMapping("/orders/status")
    public String changeOrderStatus(@RequestBody Map<String, String> payload) {
        String orderId = payload.get("orderId");
        String statusStr = payload.get("status");

        OrderStatus status = OrderStatus.valueOf(statusStr);

        UpdateOrderStatusRequest grpcRequest = com.jun.grpc.order.UpdateOrderStatusRequest.newBuilder()
                .setOrderId(orderId)
                .setStatus(status.name())
                .build();

        orderStub.updateOrderStatus(grpcRequest);

        String message = status.getMessage();

        messagingTemplate.convertAndSend("/sub/orders", message);

        return "상태 변경 완료: " + status.name();
    }

}
