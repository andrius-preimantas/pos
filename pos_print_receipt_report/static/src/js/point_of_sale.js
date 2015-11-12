openerp.pos_print_receipt_report = function (instance) {
    var _t = instance.web._t,
        _lt = instance.web._lt;
    var QWeb = instance.web.qweb;

    var error_message = {
        message: _t('Unable to print receipt'),
        comment: _t('Server or internet connection is down. Consider printing receipt directly (hint: on Windows press Ctrl + P)'),
    }
    var PosModelSuper = instance.point_of_sale.PosModel;

    instance.point_of_sale.PosModel = instance.point_of_sale.PosModel.extend({

        _get_receipt_action: function(server_id) {
            return this.pos_widget.do_action(
                'point_of_sale.action_report_pos_receipt',
                {additional_context: {active_ids:[server_id]}}
            )
        },

        _get_order_record: function(pos_reference) {
            pos_order = new instance.web.Model('pos.order').query(['id']).filter(
                    [['pos_reference', '=', pos_reference]]).first()

            return pos_order;
        },

        get_receipt_report: function(selectedOrder) {
            var to_ret = $.Deferred()

            if (selectedOrder && selectedOrder.server_id) {
                var action = this._get_receipt_action(selectedOrder.server_id);

                action.fail(function() {
                    to_ret.reject()
                });

                action.done(function() {
                    to_ret.resolve()
                });
            } else {
                to_ret.resolve()
            }

            return to_ret;
        },

        _flush_orders_receipt: function(selectedOrder) {
            var self = this;
            var pos_reference = selectedOrder.attributes.name;

            if (!pos_reference) {
                to_ret = $.Deferred()
                to_ret.resolve()
                return to_ret
            }

            var order = self._get_order_record(pos_reference);

            order.done(function(order_rec) {
                if (order_rec) {
                    selectedOrder.server_id = order_rec.id;
                    return self.get_receipt_report(selectedOrder);
                } else {
                    var to_ret = $.Deferred()
                    to_ret.reject()
                    return to_ret;
                }
            });

            return order;
        },

        _flush_orders: function(orders, options) {
            var to_ret = PosModelSuper.prototype._flush_orders.call(this, orders, options);
            var self = this;
            var selectedOrder = self.pos_widget.pos.get('selectedOrder');

            return to_ret.then(function () {
                return self._flush_orders_receipt(selectedOrder);
            });
        },
    });

    instance.point_of_sale.ReceiptScreenWidget.include({

        print: function() {
            var self = this;
            var selectedOrder = self.pos.get('selectedOrder');
            self.pos.get_receipt_report(selectedOrder).fail(function() {
                self.pos_widget.screen_selector.show_popup('error', error_message);
            });
        },
    });
};
