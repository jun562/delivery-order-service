package com.jun.orderserver.grpc;

import com.jun.grpc.order.Empty;
import com.jun.grpc.order.MenuListResponse;
import com.jun.grpc.order.MenuRequest;
import com.jun.grpc.order.MenuResponse;
import com.jun.grpc.order.MenuServiceGrpc;
import com.jun.orderserver.domain.Menu;
import com.jun.orderserver.repository.MenuRepository;
import io.grpc.stub.StreamObserver;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
@RequiredArgsConstructor
public class MenuGrpcService extends MenuServiceGrpc.MenuServiceImplBase {

    private final MenuRepository menuRepository;

    @Override
    public void addMenu(MenuRequest request, StreamObserver<MenuResponse> responseObserver) {

        Menu menu = buildMenu(request);

        saveMenu(menu);

        MenuResponse response = createResponse(menu);

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    @Override
    public void getMenus(Empty request, StreamObserver<MenuListResponse> responseObserver) {
        List<MenuResponse> menus = getMenuResponse();

        MenuListResponse response = createResponse(menus);

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    private Menu buildMenu(MenuRequest request) {
        return Menu.builder()
                .name(request.getName())
                .price(request.getPrice())
                .description(request.getDescription())
                .build();
    }

    private List<MenuResponse> getMenuResponse() {
        return menuRepository.findAll().stream()
                .map(m -> MenuResponse.newBuilder()
                        .setId(m.getId())
                        .setName(m.getName())
                        .setPrice(m.getPrice())
                        .build())
                .collect(Collectors.toList());
    }

    private void saveMenu(Menu menu) {
        menuRepository.save(menu);
        System.out.println("[메뉴 등록] " + menu.getName());
    }

    private MenuResponse createResponse(Menu menu) {
        return MenuResponse.newBuilder()
                .setId(menu.getId())
                .setName(menu.getName())
                .setPrice(menu.getPrice())
                .build();
    }

    private MenuListResponse createResponse(List<MenuResponse> menus) {
        return MenuListResponse.newBuilder()
                .addAllMenus(menus)
                .build();
    }
}

