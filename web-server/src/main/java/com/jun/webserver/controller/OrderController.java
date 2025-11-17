package com.jun.webserver.controller;

import com.jun.grpc.order.CreateOrderRequest;
import com.jun.grpc.order.CreateOrderResponse;
import com.jun.grpc.order.OrderServiceGrpc;
import com.jun.grpc.order.UpdateOrderStatusResponse;
import com.jun.webserver.dto.OrderAcceptDto;
import com.jun.webserver.dto.OrderRequestDto;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OrderController {
    @GrpcClient("order-service")
    private OrderServiceGrpc.OrderServiceBlockingStub orderStub;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

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

    @PostMapping("/orders/accept")
    public String acceptOrder(@RequestBody OrderAcceptDto requestDto) {
        String orderId = requestDto.getOrderId();
        var grpcRequest = com.jun.grpc.order.UpdateOrderStatusRequest.newBuilder()
                .setOrderId(orderId)
                .setStatus("조리중")
                .build();

        UpdateOrderStatusResponse response = orderStub.updateOrderStatus(grpcRequest);

        String message = "[알림] 주문(" + response.getOrderId() + ")이 수락되어 '조리 중'입니다!";
        messagingTemplate.convertAndSend("/sub/orders", message);

        return "수락 처리 완료";
    }

}
