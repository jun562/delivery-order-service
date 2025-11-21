package com.jun.orderserver.grpc;

import com.jun.grpc.order.CreateOrderRequest;
import com.jun.grpc.order.CreateOrderResponse;
import com.jun.grpc.order.OrderServiceGrpc.OrderServiceImplBase;
import com.jun.grpc.order.UpdateOrderStatusRequest;
import com.jun.grpc.order.UpdateOrderStatusResponse;
import com.jun.orderserver.domain.Order;
import com.jun.orderserver.repository.OrderRepository;
import io.grpc.stub.StreamObserver;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.transaction.annotation.Transactional;

@GrpcService
@RequiredArgsConstructor
public class OrderGrpcService extends OrderServiceImplBase {

    private final OrderRepository orderRepository;

    @Override
    public void createOrder(CreateOrderRequest request, StreamObserver<CreateOrderResponse> responseObserver) {
        String orderId = createId();
        Order order = buildOrder(orderId, request);

        saveOrder(order, orderId);

        responseObserver.onNext(createResponse(orderId));
        responseObserver.onCompleted();
    }

    @Override
    @Transactional
    public void updateOrderStatus(UpdateOrderStatusRequest request,
                                  StreamObserver<UpdateOrderStatusResponse> responseObserver) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new RuntimeException("주문 내역을 찾을 수 없습니다."));

        order.changeStatus(request.getStatus());

        responseObserver.onNext(createUpdatedOrderResponse(order));
        responseObserver.onCompleted();
    }

    private String createId() {
        return UUID.randomUUID().toString();
    }

    private Order buildOrder(String orderId, CreateOrderRequest request) {
        return Order.builder()
                .orderId(orderId)
                .customerId(request.getCustomerId())
                .restaurantId(request.getRestaurantId())
                .menuName(request.getMenuName())
                .price(request.getPrice())
                .status("주문 대기중")
                .build();

    }

    private void saveOrder(Order order, String orderId) {
        orderRepository.save(order);
        System.out.println("[DB 저장 완료] Order ID: " + orderId);
    }

    private CreateOrderResponse createResponse(String orderId) {
        return CreateOrderResponse.newBuilder()
                .setOrderId(orderId)
                .setStatus("주문 대기중")
                .setMessage("주문이 성공적으로 접수되었습니다.")
                .build();
    }

    private UpdateOrderStatusResponse createUpdatedOrderResponse(Order order) {
        return UpdateOrderStatusResponse.newBuilder()
                .setOrderId(order.getOrderId())
                .setStatus(order.getStatus())
                .build();
    }
}
