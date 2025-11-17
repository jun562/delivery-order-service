package com.jun.orderserver.grpc;

import com.jun.grpc.order.CreateOrderRequest;
import com.jun.grpc.order.CreateOrderResponse;
import com.jun.grpc.order.OrderServiceGrpc.OrderServiceImplBase;
import com.jun.orderserver.domain.Order;
import com.jun.orderserver.repository.OrderRepository;
import io.grpc.stub.StreamObserver;
import java.util.UUID;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
public class OrderGrpcService extends OrderServiceImplBase {

    private OrderRepository orderRepository;

    @Override
    public void createOrder(CreateOrderRequest request, StreamObserver<CreateOrderResponse> responseObserver) {

        String orderId = UUID.randomUUID().toString();

        Order order = Order.builder()
                .orderId(orderId)
                .customerId(request.getCustomerId())
                .restaurantId(request.getRestaurantId())
                .menuName(request.getMenuName())
                .price(request.getPrice())
                .status("PENDING") // 초기 상태: 대기 중
                .build();

        orderRepository.save(order);
        System.out.println("💾 [DB 저장 완료] Order ID: " + orderId);

        CreateOrderResponse response = CreateOrderResponse.newBuilder()
                .setOrderId(orderId)
                .setStatus("PENDING")
                .setMessage("주문이 성공적으로 접수되었습니다.")
                .build();
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

}
